from flask import Flask, render_template, request, jsonify
import chess
import random
import threading
import time
from collections import defaultdict

app = Flask(__name__)

# Global dictionary to store position history for each game
position_history = defaultdict(set)

def is_knight_outpost(board, square, color):
    """Check if a knight is on an outpost (protected by pawns and not easily attacked)"""
    if not board.piece_at(square) or board.piece_at(square).piece_type != chess.KNIGHT:
        return False
    
    # Check if the knight is protected by a pawn
    protected = False
    for move in board.legal_moves:
        if move.to_square == square and board.piece_at(move.from_square).piece_type == chess.PAWN:
            protected = True
            break
    
    if not protected:
        return False
    
    # Check if enemy pawns can attack the square
    rank = chess.square_rank(square)
    file = chess.square_file(square)
    
    # Check for enemy pawns that could attack this square
    enemy_color = not color
    for offset in [-1, 1]:  # Check both diagonals
        if 0 <= file + offset < 8:
            attack_square = chess.square(file + offset, rank + (1 if enemy_color else -1))
            if board.piece_at(attack_square) and board.piece_at(attack_square).piece_type == chess.PAWN and board.piece_at(attack_square).color == enemy_color:
                return False
    
    return True

def is_open_file(board, file):
    """Check if a file is open (no pawns on it)"""
    for rank in range(8):
        square = chess.square(file, rank)
        if board.piece_at(square) and board.piece_at(square).piece_type == chess.PAWN:
            return False
    return True

def evaluate_position(board, position_history_key):
    """Enhanced evaluation function with positional bonuses"""
    if board.is_checkmate():
        return -10000 if board.turn else 10000
    
    if board.is_stalemate() or board.is_insufficient_material():
        return 0
    
    piece_values = {
        chess.PAWN: 100,
        chess.KNIGHT: 320,
        chess.BISHOP: 330,
        chess.ROOK: 500,
        chess.QUEEN: 900,
        chess.KING: 20000
    }
    
    # Center squares
    center_squares = [chess.D4, chess.E4, chess.D5, chess.E5]
    center_bonus = 30  # Bonus for each piece in center
    
    score = 0
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if piece is not None:
            # Basic material value
            value = piece_values[piece.piece_type]
            
            # Center control bonus
            if square in center_squares:
                value += center_bonus
            
            # Rook on open file bonus
            if piece.piece_type == chess.ROOK and is_open_file(board, chess.square_file(square)):
                value += 50
            
            # Knight outpost bonus
            if piece.piece_type == chess.KNIGHT and is_knight_outpost(board, square, piece.color):
                value += 40
            
            if piece.color == chess.WHITE:
                score += value
            else:
                score -= value
    
    # Castling bonus
    if board.has_castling_rights(chess.WHITE):
        if board.has_kingside_castling_rights(chess.WHITE):
            score += 50
        if board.has_queenside_castling_rights(chess.WHITE):
            score += 50
    if board.has_castling_rights(chess.BLACK):
        if board.has_kingside_castling_rights(chess.BLACK):
            score -= 50
        if board.has_queenside_castling_rights(chess.BLACK):
            score -= 50
    
    # Penalize repeated positions
    current_fen = board.fen()
    if current_fen in position_history[position_history_key]:
        # Apply a significant penalty for repeating positions
        score -= 500
    
    return score

def find_best_move(board, depth, alpha=float('-inf'), beta=float('inf'), maximizing_player=True, position_history_key=None):
    """Minimax algorithm with alpha-beta pruning"""
    if depth == 0 or board.is_game_over():
        return evaluate_position(board, position_history_key)
    
    if maximizing_player:
        max_eval = float('-inf')
        for move in board.legal_moves:
            board.push(move)
            eval = find_best_move(board, depth - 1, alpha, beta, False, position_history_key)
            board.pop()
            max_eval = max(max_eval, eval)
            alpha = max(alpha, eval)
            if beta <= alpha:
                break
        return max_eval
    else:
        min_eval = float('inf')
        for move in board.legal_moves:
            board.push(move)
            eval = find_best_move(board, depth - 1, alpha, beta, True, position_history_key)
            board.pop()
            min_eval = min(min_eval, eval)
            beta = min(beta, eval)
            if beta <= alpha:
                break
        return min_eval

def get_best_move_iterative(board, max_depth, time_limit=5.0, position_history_key=None):
    """Find the best move using iterative deepening with time limit"""
    start_time = time.time()
    best_move = None
    best_value = float('-inf')
    
    # Start with depth 1 and increase until time limit or max depth
    for depth in range(1, max_depth + 1):
        if time.time() - start_time > time_limit:
            break
            
        current_best_move = None
        current_best_value = float('-inf')
        
        for move in board.legal_moves:
            if time.time() - start_time > time_limit:
                break
                
            board.push(move)
            value = find_best_move(board, depth - 1, float('-inf'), float('inf'), False, position_history_key)
            board.pop()
            
            if value > current_best_value:
                current_best_value = value
                current_best_move = move
        
        if current_best_move is not None:
            best_move = current_best_move
            best_value = current_best_value
    
    return best_move

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/move', methods=['POST'])
def move():
    data = request.get_json()
    if not data or 'fen' not in data:
        return jsonify({'error': 'Invalid request'}), 400

    difficulty = data.get('difficulty', 'medium')
    max_depth = {'easy': 2, 'medium': 3, 'hard': 4}.get(difficulty, 1)
    time_limit = {'easy': 2.0, 'medium': 3.0, 'hard': 5.0}.get(difficulty, 1.0)

    # Generate a unique key for this game based on the current position
    position_history_key = data['fen'].split(' ')[0]  # Use the board position part of FEN as key
    
    board = chess.Board(data['fen'])
    
    # Add current position to history
    position_history[position_history_key].add(board.fen())
    
    # Get the best move considering position history
    best_move = get_best_move_iterative(board, max_depth, time_limit, position_history_key)
    
    # Make the move and add the new position to history
    board.push(best_move)
    position_history[position_history_key].add(board.fen())

    if len(position_history) > 10:
        oldest_key = next(iter(position_history))
        del position_history[oldest_key]
    
    return jsonify({'fen': board.fen()})

if __name__ == '__main__':
    app.run(debug=True)
