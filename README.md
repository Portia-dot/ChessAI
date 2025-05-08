# Chess AI Web Application

A web-based chess application that allows users to play against an AI opponent. Built with Flask, chess.js, and chessboard.js.

## Features

- Interactive chess board with drag-and-drop piece movement
- Optional game timer with 10-minute time control
- Legal move validation
- Game state tracking (check, checkmate, draw)
- Responsive design that works on desktop
- Clean, modern UI with smooth animations

## Prerequisites

- Python 3.7 or higher
- pip (Python package manager)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ChessAI
```

2. Create a virtual environment (recommended):

```bash
python -m venv venv
```

3. Activate the virtual environment:

- Windows:

```bash
venv\Scripts\activate
```

- Unix/MacOS:

```bash
source venv/bin/activate
```

4. Install the required packages:

```bash
pip install -r requirements.txt
```

## Running the Application

1. Start the Flask server:

```bash
python app.py
```

2. Open your web browser and navigate to:

```
http://localhost:5000
```

## How to Play

1. The game starts with white pieces (you) to move first
2. Drag and drop pieces to make your moves
3. The AI will automatically respond to your moves
4. Optional timer can be toggled on/off using the switch above the board
5. Game status is displayed below the board

## Game Rules

- Standard chess rules apply
- Pawns automatically promote to queens
- The game ends on checkmate, stalemate, or if a player runs out of time (when timer is enabled)

## Project Structure

```
ChessAI/
├── app.py              # Flask backend
├── requirements.txt    # Python dependencies
├── static/
│   └── js/
│       └── chess.js    # Frontend game logic
└── templates/
    └── index.html      # Main HTML template
```

## Technologies Used

- Backend:
  - Flask (Python web framework)
  - python-chess (Chess logic and move validation)
- Frontend:
  - chess.js (Chess logic and move validation)
  - chessboard.js (Chess board UI)
  - jQuery (DOM manipulation)

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is licensed under the MIT License - see the LICENSE file for details.
