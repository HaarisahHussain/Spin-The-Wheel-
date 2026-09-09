# Spin The Wheel — Local Arcade Build

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173` on the host laptop. The host page creates the local session and QR. Phones scan the QR and must be on the same Wi-Fi network.

Use **Open Monitor Display** from Host Control for the public screen.

## Current experience

- Host Control is the admin/control view and keeps the QR available for new players.
- Monitor is a public-facing show view: forms/waiting → wheel visible → synchronized spin → Loading game → Let's Play → live game → results.
- Phone is the player controller.
- No PeerJS; local real-time sync uses Socket.IO.
- The wheel is visible on the monitor as soon as the player enters the wheel stage, not only after pressing Spin.
- Wheel result and animation are synchronized by the server.
- Player form collects name, degree/field of study, and optional interests: Socialising, Gaming, Hobbies.
- Players can queue while another game is active.
- Multiplayer groups are grouped by game + mode and the next ready group takes the main screen.
- Games:
  - Guess The Output — buzzer round, first-to-buzz, +100 correct / -50 wrong.
  - Debug Dash — four escalating bug-finding levels with a 20–30 second challenge window.
  - Robot Rescue — visual grid navigation using a limited command set and move budget.
- Public game state is broadcast to the monitor so code, selections, robot movement and leaderboard data can be shown live.


## Current experience

- Wheel has exactly three outcomes: Debug Dash, Robot Rescue, Guess The Output.
- Host Control keeps the QR; the public monitor does not.
- Music can be enabled from the Host Control and Monitor waiting screen using the Music button.
- Robot Rescue uses Scratch-style command blocks: Move Forward, Turn Left, Turn Right, then Run Program.
- Robot commands execute on the server so the monitor follows the robot step-by-step.
