import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { makeGameData } from "../server/games/data.js";
import { generateGuessLevels } from "../server/games/guess-output/levels.js";
import {
  generateRobotLevels,
  hasRobotPath,
} from "../server/games/robot-rescue/levels.js";
import { createSessionEngine } from "../server/sessions/engine.js";
import { publicState, publicGameData } from "../server/sessions/selectors.js";
import { registerPlayerHandlers } from "../server/socket/player.js";
import { registerHostHandlers } from "../server/socket/host.js";
import { clearTimers, schedule } from "../server/sessions/timers.js";
import { GAMES, WHEEL_SEGMENT_CENTERS } from "../shared/games.js";

function setup(
  t,
  { game = "Debug Dash", mode = "Single Player", count = 1 } = {},
) {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 100000 });
  const messages = [];
  const io = {
    to: (room) => ({
      emit: (event, payload) =>
        messages.push({ room, event, payload: structuredClone(payload) }),
    }),
  };
  const players = Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
    game,
    mode,
    status: "QUEUED",
  }));
  const session = {
    sessionId: "TEST",
    hostSocketId: "host",
    players: new Map(players.map((p) => [p.id, p])),
    queue: players.map((p) => p.id),
    activeGroup: null,
    state: "WAITING",
    publicPhase: { type: "FILLING_FORMS" },
    gameData: null,
    gameDataByPlayer: null,
    wheelByPlayer: new Map(),
    wheelBag: [],
    timers: new Set(),
  };
  const engine = createSessionEngine(io);
  const context = { io, getSession: () => session, engine };
  const clients = new Map();
  function client(id, role = "player") {
    if (clients.has(id)) return clients.get(id);
    const handlers = new Map();
    const socket = {
      id,
      data: { sessionId: "TEST", playerId: id, role },
      on: (event, handler) => handlers.set(event, handler),
      emit: (event, payload) =>
        messages.push({ room: id, event, payload: structuredClone(payload) }),
    };
    registerPlayerHandlers(socket, context);
    registerHostHandlers(socket, context);
    const result = {
      event: (type, payload = {}) =>
        handlers.get("player:event")({ type, payload }),
      host: (type, payload = {}) => {
        let response;
        handlers.get("host:event")({ type, payload }, (result) => {
          response = result;
        });
        return response;
      },
    };
    clients.set(id, result);
    return result;
  }
  t.after(() => clearTimers(session));
  const start = () => {
    engine.startNextGroup(
      session,
      false,
      mode === "Multiplayer" ? `${game}::${mode}` : null,
    );
    t.mock.timers.tick(2200);
  };
  return { session, engine, players, client, start, messages };
}

test("generated output answers match actual JavaScript and exist in the options", () => {
  for (let i = 0; i < 150; i++)
    for (const level of generateGuessLevels()) {
      let output;
      vm.runInNewContext(
        level.question,
        {
          console: {
            log: (value) => {
              output = value;
            },
          },
        },
        { timeout: 100 },
      );
      assert.ok(level.options.includes(level.correctAnswer));
      assert.equal(
        new Set(level.options.map((option) => option.slice(3))).size,
        4,
      );
      assert.equal(level.correctAnswer.slice(3), String(output));
    }
});

test("generated robot boards have a route and keep start/finish clear", () => {
  for (let i = 0; i < 75; i++)
    for (const level of generateRobotLevels()) {
      assert.ok(hasRobotPath(level.obstacles));
      assert.ok(!level.obstacles.includes(0) && !level.obstacles.includes(24));
    }
});

test("unknown games fail explicitly instead of silently becoming Guess The Output", () => {
  assert.throws(() => makeGameData("Typo", []), /Unknown game/);
});

test("state and event broadcasts never expose answer keys or future levels", (t) => {
  const { session, start, messages, client } = setup(t);
  start();
  client("p0").event("GAME_EVENT", { action: "DEBUG_LINE", line: 0 });
  const privateKeys =
    /"(?:targetLine|correctAnswer|debugLevels|guessLevels|robotLevels)"/;
  assert.doesNotMatch(JSON.stringify(publicState(session)), privateKeys);
  assert.doesNotMatch(JSON.stringify(messages), privateKeys);
  for (const game of GAMES)
    assert.doesNotMatch(
      JSON.stringify(publicGameData(makeGameData(game, [{ id: "p" }]))),
      privateKeys,
    );
});

test("single-player queue admits exactly one player", (t) => {
  const { session, start } = setup(t, { count: 3 });
  start();
  assert.equal(session.activeGroup.players.length, 1);
  assert.equal(session.queue.length, 2);
});

test("queued players cannot end the active game, inject scores, or use host controls", (t) => {
  const { session, start, client } = setup(t, { count: 2 });
  start();
  const activeId = session.activeGroup.id;
  client("p1").event("GAME_FINISHED", { score: 999999 });
  client("p1").event("GAME_EVENT", {
    action: "DEBUG_LINE",
    line: session.gameData.targetLine,
  });
  assert.equal(client("p1").host("RESET_SERVER").ok, false);
  assert.equal(session.activeGroup.id, activeId);
  assert.equal(session.gameData.scores.p0, 0);
});

test("actions before announcement ends and after deadline are rejected", (t) => {
  const { session, engine, client } = setup(t);
  engine.startNextGroup(session);
  client("p0").event("GAME_EVENT", {
    action: "DEBUG_LINE",
    line: session.gameData.targetLine,
  });
  assert.equal(session.gameData.scores.p0, 0);
  t.mock.timers.tick(2200);
  session.gameData.deadlineAt = Date.now() - 1;
  client("p0").event("GAME_EVENT", {
    action: "DEBUG_LINE",
    line: session.gameData.targetLine,
  });
  assert.equal(session.gameData.scores.p0, 0);
});

test("new arrivals and parallel wheel spins do not replace a running game", (t) => {
  const { session, start, client } = setup(t, { count: 2 });
  start();
  const newcomer = session.players.get("p1");
  newcomer.status = "CONNECTED";
  session.queue = [];
  client("p1").event("FORM_SUBMITTED", { name: "New", study: "CS" });
  client("p1").event("SHOW_WHEEL");
  client("p1").event("SPIN_REQUEST");
  assert.equal(session.publicPhase.type, "GAME");
  assert.equal(session.state, "PLAYING");
  t.mock.timers.tick(3500);
  assert.equal(session.publicPhase.type, "GAME");
  assert.equal(newcomer.status, "GAME_SELECTED");
  client("p1").event("JOINED_QUEUE", { mode: "Single Player" });
  assert.equal(session.publicPhase.type, "GAME");
  assert.equal(session.state, "PLAYING");
});

test("reset cancels delayed spin completion and clears all wheel state", (t) => {
  const { session, client } = setup(t);
  session.queue = [];
  session.players.get("p0").status = "READY_TO_SPIN";
  client("p0").event("SPIN_REQUEST");
  assert.equal(session.wheel.active, true);
  assert.equal(client("host", "host").host("RESET_SERVER").ok, true);
  t.mock.timers.tick(5000);
  assert.equal(session.players.get("p0").status, "CONNECTED");
  assert.equal(session.wheelByPlayer.size, 0);
  assert.equal(session.publicPhase.type, "FILLING_FORMS");
});

test("wheel landing matches its selected segment and repeat spins retain rotation", (t) => {
  const { session, client } = setup(t);
  session.queue = [];
  const player = session.players.get("p0");
  let previous = 0;
  for (let i = 0; i < 6; i++) {
    player.status = "READY_TO_SPIN";
    client("p0").event("SPIN_REQUEST");
    const wheel = session.wheel;
    assert.equal(wheel.startRotation, previous);
    const target = wheel.startRotation + wheel.delta;
    assert.equal(
      (target + WHEEL_SEGMENT_CENTERS[GAMES.indexOf(wheel.result)]) % 360,
      0,
    );
    t.mock.timers.tick(3500);
    previous = target;
  }
});

test("multiplayer completion retains all players’ scores", (t) => {
  const { session, start, client } = setup(t, {
    mode: "Multiplayer",
    count: 2,
  });
  start();
  session.gameDataByPlayer.get("p1").scores.p1 = 150;
  for (let i = 0; i < 4; i++)
    client("p0").event("GAME_EVENT", {
      action: "DEBUG_LINE",
      line: session.gameData.targetLine,
    });
  assert.equal(session.publicPhase.type, "RESULTS");
  assert.deepEqual(session.publicPhase.scores, { p0: 1000, p1: 150 });
});

test("multiplayer answer requires a buzz and a wrong answer reopens it", (t) => {
  const { session, start, client } = setup(t, {
    game: "Guess The Output",
    mode: "Multiplayer",
    count: 2,
  });
  start();
  const player = client("p0"),
    data = session.gameData;
  player.event("GAME_EVENT", { action: "ANSWER", answer: data.correctAnswer });
  assert.equal(data.level, 1);
  player.event("GAME_EVENT", { action: "BUZZ" });
  player.event("GAME_EVENT", {
    action: "ANSWER",
    answer: data.options.find((x) => x !== data.correctAnswer),
  });
  assert.equal(data.buzzedBy, null);
  assert.equal(data.scores.p0, 0);
  player.event("GAME_EVENT", { action: "BUZZ" });
  player.event("GAME_EVENT", { action: "ANSWER", answer: data.correctAnswer });
  assert.equal(data.level, 2);
});

test("robot execution is bounded, cannot be rewritten mid-run, and reset cancels it", (t) => {
  const { session, start, client } = setup(t, { game: "Robot Rescue" });
  start();
  const player = client("p0"),
    data = session.gameData;
  player.event("GAME_EVENT", {
    action: "ROBOT_PROGRAM",
    commands: Array(200).fill("left"),
  });
  assert.equal(data.program.length, 100);
  player.event("GAME_EVENT", { action: "ROBOT_RUN" });
  assert.equal(data.executing, true);
  player.event("GAME_EVENT", {
    action: "ROBOT_PROGRAM",
    commands: ["forward"],
  });
  assert.equal(data.program.length, 100);
  client("host", "host").host("RESET_SERVER");
  const orientation = data.orientation;
  t.mock.timers.tick(1000);
  assert.equal(data.orientation, orientation);
  assert.equal(session.activeGroup, null);
});

test("finishing a game does not cancel another player’s pending wheel", (t) => {
  const { session, start, client, engine } = setup(t, { count: 2 });
  start();
  session.players.get("p1").status = "READY_TO_SPIN";
  session.queue = [];
  client("p1").event("SPIN_REQUEST");
  engine.finishActiveGroup(session);
  t.mock.timers.tick(3500);
  assert.equal(session.players.get("p1").status, "GAME_SELECTED");
});

test("tracked delayed callbacks are removed after execution", (t) => {
  const { session } = setup(t);
  let ran = false;
  schedule(
    session,
    () => {
      ran = true;
    },
    5,
  );
  t.mock.timers.tick(5);
  assert.ok(ran);
  assert.equal(session.timers.size, 0);
});
