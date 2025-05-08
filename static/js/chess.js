let board = null;
let game = new Chess();
let $status = $("#status");
let whiteTimeLeft = 600; // 10 minutes in seconds
let blackTimeLeft = 600;
let timerInterval = null;
let currentPlayer = "w";
let isTimerEnabled = false;
let isDarkMode = false;
let currentDifficulty = "easy";
let selectedSquare = null;

// Theme management
function toggleTheme() {
  isDarkMode = !isDarkMode;
  document.body.setAttribute("data-theme", isDarkMode ? "dark" : "light");

  // Update theme toggle icon and text
  const themeIcon = document.querySelector(".theme-icon");
  const themeLabel = document.querySelector(".theme-toggle .switch-label");

  if (isDarkMode) {
    themeIcon.textContent = "☀️";
    themeLabel.textContent = "Light Mode";
  } else {
    themeIcon.textContent = "🌙";
    themeLabel.textContent = "Dark Mode";
  }

  // Save theme preference
  localStorage.setItem("theme", isDarkMode ? "dark" : "light");
}

// Initialize theme from localStorage
function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    isDarkMode = true;
    document.body.setAttribute("data-theme", "dark");
    document.querySelector(".theme-icon").textContent = "☀️";
    document.querySelector(".theme-toggle .switch-label").textContent =
      "Light Mode";
  }
}

// Difficulty management
function resetGame() {
  // Reset the game state
  game = new Chess();
  board.position("start");
  clearHighlights();
  selectedSquare = null;

  // Reset timers if enabled
  if (isTimerEnabled) {
    resetTimers();
    startTimer();
  }

  // Reset player turn
  currentPlayer = "w";

  // Update status
  updateStatus();
}

function setDifficulty(difficulty) {
  // If the game has started (not in initial position), reset the game
  if (game.history().length > 0) {
    if (
      !confirm("Changing difficulty will reset the current game. Continue?")
    ) {
      return;
    }
    resetGame();
  }

  currentDifficulty = difficulty;

  // Update button states
  document.querySelectorAll(".difficulty-button").forEach((button) => {
    button.classList.remove("active");
    if (button.dataset.difficulty === difficulty) {
      button.classList.add("active");
    }
  });

  // Save difficulty preference
  localStorage.setItem("difficulty", difficulty);
}

function initDifficulty() {
  const savedDifficulty = localStorage.getItem("difficulty") || "easy";
  setDifficulty(savedDifficulty);
}

function clearHighlights() {
  // Remove all highlights
  $(".square-55d63").removeClass("highlight selected");
  selectedSquare = null;
}

function highlightLegalMoves(square) {
  clearHighlights();

  // Get all legal moves
  const moves = game.moves({ square: square, verbose: true });

  // Highlight the selected square
  $(`#${square}`).addClass("selected");
  selectedSquare = square;

  // Highlight all legal move squares
  moves.forEach((move) => {
    $(`#${move.to}`).addClass("highlight");
  });
}

function showLoadingSpinner() {
  document.querySelector(".spinner-overlay").classList.add("active");
  document.querySelector(".loading-spinner").classList.add("active");
}

function hideLoadingSpinner() {
  document.querySelector(".spinner-overlay").classList.remove("active");
  document.querySelector(".loading-spinner").classList.remove("active");
}

function onSquareClick(square) {
  // Don't allow clicking if it's not the player's turn
  if (game.turn() !== "w") return;

  const piece = game.get(square);

  // If a square is already selected
  if (selectedSquare) {
    // If clicking the same square, deselect it
    if (square === selectedSquare) {
      clearHighlights();
      return;
    }

    // Try to make the move
    const move = {
      from: selectedSquare,
      to: square,
      promotion: "q", // Always promote to a queen for simplicity
    };

    const result = game.move(move);

    // If the move is legal
    if (result) {
      clearHighlights();
      board.position(game.fen());

      // Switch timer to black's turn
      currentPlayer = "b";
      if (isTimerEnabled) {
        startTimer();
      }

      // Show loading spinner
      showLoadingSpinner();

      // Send the move to the backend
      fetch("/move", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fen: game.fen(),
          difficulty: currentDifficulty,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.fen) {
            game.load(data.fen);
            board.position(data.fen);
            updateStatus();
            // Switch timer back to white's turn
            currentPlayer = "w";
            if (isTimerEnabled) {
              startTimer();
            }
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          $status.html("Error communicating with server");
        })
        .finally(() => {
          hideLoadingSpinner();
        });

      updateStatus();
    }
  } else if (piece && piece.color === "w") {
    // If clicking a white piece, highlight its legal moves
    highlightLegalMoves(square);
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function updateTimers() {
  $("#white-timer").text(formatTime(whiteTimeLeft));
  $("#black-timer").text(formatTime(blackTimeLeft));
}

function startTimer() {
  if (!isTimerEnabled) return;

  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerInterval = setInterval(() => {
    if (currentPlayer === "w") {
      whiteTimeLeft--;
    } else {
      blackTimeLeft--;
    }

    updateTimers();

    // Check if time ran out
    if (whiteTimeLeft <= 0 || blackTimeLeft <= 0) {
      clearInterval(timerInterval);
      const winner = whiteTimeLeft <= 0 ? "Black" : "White";
      $status.html(`Game over! ${winner} wins on time!`);
      board.draggable = false;
    }
  }, 1000);
}

function toggleTimer() {
  isTimerEnabled = $("#timer-toggle").is(":checked");
  if (isTimerEnabled) {
    $("#timer-container").addClass("active");
    resetTimers();
    startTimer();
  } else {
    $("#timer-container").removeClass("active");
    if (timerInterval) {
      clearInterval(timerInterval);
    }
  }
}

function resetTimers() {
  whiteTimeLeft = 600;
  blackTimeLeft = 600;
  updateTimers();
}

function onDragStart(source, piece) {
  // Only allow white pieces to be dragged
  if (game.game_over() || piece.search(/^b/) !== -1) {
    return false;
  }
}

function onDrop(source, target) {
  // See if the move is legal
  let move = game.move({
    from: source,
    to: target,
    promotion: "q", // Always promote to a queen for simplicity
  });

  // Illegal move
  if (move === null) return "snapback";

  // Switch timer to black's turn
  currentPlayer = "b";
  if (isTimerEnabled) {
    startTimer();
  }

  // Send the move to the backend
  fetch("/move", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fen: game.fen(),
      difficulty: currentDifficulty,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.fen) {
        game.load(data.fen);
        board.position(data.fen);
        updateStatus();
        // Switch timer back to white's turn
        currentPlayer = "w";
        if (isTimerEnabled) {
          startTimer();
        }
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      $status.html("Error communicating with server");
    });

  updateStatus();
}

function onSnapEnd() {
  board.position(game.fen());
}

function updateStatus() {
  let status = "";

  let moveColor = game.turn() === "w" ? "White" : "Black";

  // Checkmate?
  if (game.in_checkmate()) {
    status = "Game over, " + moveColor + " is in checkmate.";
    if (isTimerEnabled) {
      clearInterval(timerInterval);
    }
  }
  // Draw?
  else if (game.in_draw()) {
    status = "Game over, drawn position";
    if (isTimerEnabled) {
      clearInterval(timerInterval);
    }
  }
  // Game still on
  else {
    status = moveColor + " to move";

    // Check?
    if (game.in_check()) {
      status += ", " + moveColor + " is in check";
    }
  }

  $status.html(status);
}

// Initialize the board
board = Chessboard("board", {
  draggable: true,
  position: "start",
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd,
  pieceTheme: "https://chessboardjs.com/img/chesspieces/alpha/{piece}.png",
});

// Add click handler for squares
$("#board").on("click", ".square-55d63", function () {
  const square = $(this).data("square");
  onSquareClick(square);
});

// Set up timer toggle
$("#timer-toggle").on("change", toggleTimer);

// Set up theme toggle
$("#theme-toggle").on("click", toggleTheme);

// Set up difficulty buttons
document.querySelectorAll(".difficulty-button").forEach((button) => {
  button.addEventListener("click", () => {
    setDifficulty(button.dataset.difficulty);
  });
});

// Initialize theme and difficulty
initTheme();
initDifficulty();

updateStatus();
updateTimers();
