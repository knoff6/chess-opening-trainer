import React, { useState, useEffect } from 'react';

// Custom Chess Engine Implementation
class ChessGame {
  constructor(fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
    this.parseFEN(fen);
    this.moveHistory = [];
  }

  parseFEN(fen) {
    const parts = fen.split(' ');
    const rows = parts[0].split('/');
    
    this.board = [];
    for (let row of rows) {
      let boardRow = [];
      for (let char of row) {
        if (char >= '1' && char <= '8') {
          for (let i = 0; i < parseInt(char); i++) {
            boardRow.push(null);
          }
        } else {
          const color = char === char.toUpperCase() ? 'w' : 'b';
          const type = char.toLowerCase();
          boardRow.push({ type, color });
        }
      }
      this.board.push(boardRow);
    }
    
    this.turn = parts[1] || 'w';
    this.castling = parts[2] || 'KQkq';
    this.enPassant = parts[3] || '-';
    this.halfmove = parseInt(parts[4]) || 0;
    this.fullmove = parseInt(parts[5]) || 1;
  }

  getFEN() {
    let fen = '';
    for (let row of this.board) {
      let empty = 0;
      for (let piece of row) {
        if (piece === null) {
          empty++;
        } else {
          if (empty > 0) {
            fen += empty;
            empty = 0;
          }
          const char = piece.type;
          fen += piece.color === 'w' ? char.toUpperCase() : char;
        }
      }
      if (empty > 0) fen += empty;
      fen += '/';
    }
    fen = fen.slice(0, -1);
    fen += ` ${this.turn} ${this.castling} ${this.enPassant} ${this.halfmove} ${this.fullmove}`;
    return fen;
  }

  copy() {
    const newGame = new ChessGame(this.getFEN());
    newGame.moveHistory = [...this.moveHistory];
    return newGame;
  }

  squareToCoords(square) {
    const file = square.charCodeAt(0) - 97;
    const rank = 8 - parseInt(square[1]);
    return { row: rank, col: file };
  }

  coordsToSquare(row, col) {
    return String.fromCharCode(97 + col) + (8 - row);
  }

  getPiece(square) {
    const { row, col } = this.squareToCoords(square);
    return this.board[row][col];
  }

  isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  getLegalMoves(square) {
    const piece = this.getPiece(square);
    if (!piece || piece.color !== this.turn) return [];

    const { row, col } = this.squareToCoords(square);
    let moves = [];

    const addMove = (toRow, toCol) => {
      if (!this.isInBounds(toRow, toCol)) return false;
      const target = this.board[toRow][toCol];
      if (target && target.color === piece.color) return false;
      
      const move = {
        from: square,
        to: this.coordsToSquare(toRow, toCol),
        piece: piece.type,
        capture: target !== null
      };
      
      // Test if move leaves king in check
      const testGame = this.copy();
      testGame.makeMove(move, true);
      if (!testGame.isInCheck(piece.color)) {
        moves.push(move);
      }
      
      return target === null;
    };

    switch (piece.type) {
      case 'p': // Pawn
        const direction = piece.color === 'w' ? -1 : 1;
        const startRank = piece.color === 'w' ? 6 : 1;
        
        // Forward move
        if (!this.board[row + direction][col]) {
          addMove(row + direction, col);
          // Double move from start
          if (row === startRank && !this.board[row + 2 * direction][col]) {
            addMove(row + 2 * direction, col);
          }
        }
        
        // Captures
        if (this.isInBounds(row + direction, col - 1)) {
          const leftPiece = this.board[row + direction][col - 1];
          if (leftPiece && leftPiece.color !== piece.color) {
            addMove(row + direction, col - 1);
          }
        }
        if (this.isInBounds(row + direction, col + 1)) {
          const rightPiece = this.board[row + direction][col + 1];
          if (rightPiece && rightPiece.color !== piece.color) {
            addMove(row + direction, col + 1);
          }
        }
        break;

      case 'n': // Knight
        const knightMoves = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (let [dr, dc] of knightMoves) {
          addMove(row + dr, col + dc);
        }
        break;

      case 'b': // Bishop
        for (let dir of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
          for (let i = 1; i < 8; i++) {
            if (!addMove(row + dir[0] * i, col + dir[1] * i)) break;
          }
        }
        break;

      case 'r': // Rook
        for (let dir of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          for (let i = 1; i < 8; i++) {
            if (!addMove(row + dir[0] * i, col + dir[1] * i)) break;
          }
        }
        break;

      case 'q': // Queen
        for (let dir of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
          for (let i = 1; i < 8; i++) {
            if (!addMove(row + dir[0] * i, col + dir[1] * i)) break;
          }
        }
        break;

      case 'k': // King
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            addMove(row + dr, col + dc);
          }
        }
        break;
    }

    return moves;
  }

  findKing(color) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.type === 'k' && piece.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  }

  isSquareAttacked(row, col, byColor) {
    // Check if square is attacked by any piece of byColor
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (!piece || piece.color !== byColor) continue;

        // Simple attack check (without recursion)
        if (piece.type === 'p') {
          const dir = piece.color === 'w' ? -1 : 1;
          if (r + dir === row && Math.abs(c - col) === 1) return true;
        } else if (piece.type === 'n') {
          const dr = Math.abs(r - row);
          const dc = Math.abs(c - col);
          if ((dr === 2 && dc === 1) || (dr === 1 && dc === 2)) return true;
        } else if (piece.type === 'b' || piece.type === 'q') {
          if (Math.abs(r - row) === Math.abs(c - col)) {
            if (this.isPathClear(r, c, row, col)) return true;
          }
        }
        if (piece.type === 'r' || piece.type === 'q') {
          if (r === row || c === col) {
            if (this.isPathClear(r, c, row, col)) return true;
          }
        }
        if (piece.type === 'k') {
          if (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1) return true;
        }
      }
    }
    return false;
  }

  isPathClear(fromRow, fromCol, toRow, toCol) {
    const dRow = Math.sign(toRow - fromRow);
    const dCol = Math.sign(toCol - fromCol);
    let r = fromRow + dRow;
    let c = fromCol + dCol;
    
    while (r !== toRow || c !== toCol) {
      if (this.board[r][c] !== null) return false;
      r += dRow;
      c += dCol;
    }
    return true;
  }

  isInCheck(color) {
    const king = this.findKing(color);
    if (!king) return false;
    return this.isSquareAttacked(king.row, king.col, color === 'w' ? 'b' : 'w');
  }

  makeMove(move, skipValidation = false) {
    if (typeof move === 'string') {
      // Parse algebraic notation
      move = this.parseAlgebraic(move);
      if (!move) return null;
    }

    const { row: fromRow, col: fromCol } = this.squareToCoords(move.from);
    const { row: toRow, col: toCol } = this.squareToCoords(move.to);
    
    const piece = this.board[fromRow][fromCol];
    if (!piece) return null;

    const captured = this.board[toRow][toCol];
    
    // Make the move
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;

    // Promotion
    if (piece.type === 'p' && (toRow === 0 || toRow === 7)) {
      this.board[toRow][toCol] = { type: 'q', color: piece.color };
    }

    const moveNotation = this.getMoveNotation(move, piece, captured);
    this.moveHistory.push(moveNotation);

    // Update turn
    this.turn = this.turn === 'w' ? 'b' : 'w';
    if (this.turn === 'w') this.fullmove++;

    return { san: moveNotation, from: move.from, to: move.to };
  }

  getMoveNotation(move, piece, captured) {
    // Generate standard algebraic notation (like "Nf3", "e4", "exd5")
    // Not verbose notation (like "Ng1-f3")
    let notation = '';
    
    if (piece.type === 'p') {
      // Pawn moves
      if (captured) {
        notation += move.from[0]; // File letter for captures
        notation += 'x';
      }
      notation += move.to;
    } else {
      // Piece moves
      notation += piece.type.toUpperCase();
      
      // Add disambiguation if needed (we'll skip this for simplicity)
      
      if (captured) {
        notation += 'x';
      }
      notation += move.to;
    }
    
    return notation;
  }

  parseAlgebraic(moveStr) {
    // Simple parser for moves like "e4", "Nf3", "exd5"
    moveStr = moveStr.replace(/[+#!?]/g, '');
    
    // Try to find a valid move that matches
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = this.coordsToSquare(row, col);
        const moves = this.getLegalMoves(square);
        
        for (let move of moves) {
          const notation = this.getMoveNotation(move, this.board[row][col], this.getPiece(move.to));
          if (notation.includes(moveStr) || move.to === moveStr || 
              (moveStr.length === 2 && move.to === moveStr)) {
            return move;
          }
        }
      }
    }
    return null;
  }

  getBoard() {
    return this.board;
  }

  getTurn() {
    return this.turn;
  }

  history() {
    return this.moveHistory;
  }
}

// Opening Database with extended lines
const OPENINGS_DATABASE = {
  white: [
    {
      name: "Italian Game",
      eco: "C50",
      moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4", "exd4", "cxd4", "Bb4", "Nc3", "Nxe4", "O-O"],
      description: "Classical opening controlling the center"
    },
    {
      name: "Ruy López (Spanish Opening)",
      eco: "C60",
      moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7", "Re1", "b5", "Bb3", "d6", "c3", "O-O"],
      description: "One of the oldest and most classical openings"
    },
    {
      name: "Queen's Gambit",
      eco: "D06",
      moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7", "e3", "O-O", "Nf3", "Nbd7", "Rc1", "c6"],
      description: "Strategic opening offering a pawn for central control"
    },
    {
      name: "King's Gambit",
      eco: "C30",
      moves: ["e4", "e5", "f4", "exf4", "Nf3", "g5", "h4", "g4", "Ne5", "Nf6", "Bc4", "d5", "exd5"],
      description: "Aggressive romantic-era gambit"
    },
    {
      name: "Scotch Game",
      eco: "C45",
      moves: ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4", "Nf6", "Nxc6", "bxc6", "e5", "Qe7", "Qe2", "Nd5"],
      description: "Direct central opening"
    },
    {
      name: "English Opening",
      eco: "A10",
      moves: ["c4", "e5", "Nc3", "Nf6", "Nf3", "Nc6", "g3", "d5", "cxd5", "Nxd5", "Bg2", "Nb6"],
      description: "Hypermodern flank opening"
    },
    {
      name: "Scholar's Mate Trap",
      eco: "C20",
      moves: ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7"],
      description: "Beginner trap aiming for quick mate"
    },
    {
      name: "Vienna Game",
      eco: "C25",
      moves: ["e4", "e5", "Nc3", "Nf6", "f4", "d5", "fxe5", "Nxe4", "Nf3", "Bg4", "Qe2", "Nxc3"],
      description: "Flexible opening preparing f4"
    },
    {
      name: "London System",
      eco: "D02",
      moves: ["d4", "Nf6", "Nf3", "d5", "Bf4", "e6", "e3", "Bd6", "Bg3", "O-O", "Nbd2", "c5", "c3"],
      description: "Solid and systematic opening"
    },
    {
      name: "Catalan Opening",
      eco: "E00",
      moves: ["d4", "Nf6", "c4", "e6", "g3", "d5", "Bg2", "Be7", "Nf3", "O-O", "O-O", "Nbd7"],
      description: "Combines Queen's Gambit with fianchetto"
    },
    {
      name: "Four Knights Game",
      eco: "C47",
      moves: ["e4", "e5", "Nf3", "Nc6", "Nc3", "Nf6", "Bb5", "Bb4", "O-O", "O-O", "d3", "d6"],
      description: "Symmetrical and solid opening"
    },
    {
      name: "Giuoco Piano",
      eco: "C53",
      moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4", "exd4", "cxd4", "Bb4", "Bd2"],
      description: "Quiet Italian Game variation"
    },
    {
      name: "Evans Gambit",
      eco: "C51",
      moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "b4", "Bxb4", "c3", "Ba5", "d4", "exd4"],
      description: "Aggressive pawn sacrifice for rapid development"
    },
    {
      name: "Danish Gambit",
      eco: "C21",
      moves: ["e4", "e5", "d4", "exd4", "c3", "dxc3", "Bc4", "cxb2", "Bxb2", "Nf6", "Nc3", "Bb4"],
      description: "Double pawn gambit for attacking chances"
    },
    {
      name: "Blackmar-Diemer Gambit",
      eco: "D00",
      moves: ["d4", "d5", "e4", "dxe4", "Nc3", "Nf6", "f3", "exf3", "Nxf3", "Bg4", "h3", "Bxf3"],
      description: "Tactical gambit against d5"
    },
    {
      name: "Traxler Counter-Gambit Response",
      eco: "C57",
      moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5", "Bc5", "Nxf7", "Bxf2", "Kxf2", "Nxe4"],
      description: "Sharp tactical complications"
    }
  ],
  black: [
    {
      name: "Sicilian Defense",
      eco: "B20",
      moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6", "Be3", "e5", "Nb3", "Be6"],
      description: "Sharp, fighting defense"
    },
    {
      name: "Sicilian Dragon",
      eco: "B70",
      moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "g6", "Be3", "Bg7", "f3", "O-O"],
      description: "Aggressive fianchetto variation"
    },
    {
      name: "Sicilian Najdorf",
      eco: "B90",
      moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6", "Be3", "e5", "Nb3"],
      description: "Most popular Sicilian variation"
    },
    {
      name: "French Defense",
      eco: "C00",
      moves: ["e4", "e6", "d4", "d5", "Nc3", "Nf6", "Bg5", "Be7", "e5", "Nfd7", "Bxe7", "Qxe7", "f4", "O-O"],
      description: "Solid defensive system"
    },
    {
      name: "Caro-Kann Defense",
      eco: "B10",
      moves: ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5", "Ng3", "Bg6", "h4", "h6", "Nf3", "Nd7"],
      description: "Solid and reliable defense"
    },
    {
      name: "Scandinavian Defense",
      eco: "B01",
      moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Nf3", "Bf5", "Bc4", "e6", "Bd2"],
      description: "Immediate central challenge"
    },
    {
      name: "Pirc Defense",
      eco: "B07",
      moves: ["e4", "d6", "d4", "Nf6", "Nc3", "g6", "f4", "Bg7", "Nf3", "O-O", "Bd3", "Na6", "O-O"],
      description: "Hypermodern defense"
    },
    {
      name: "King's Indian Defense",
      eco: "E60",
      moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6", "Nf3", "O-O", "Be2", "e5", "O-O", "Nc6"],
      description: "Aggressive counterattacking setup"
    },
    {
      name: "Queen's Gambit Declined",
      eco: "D30",
      moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7", "e3", "O-O", "Nf3", "Nbd7", "Rc1", "c6"],
      description: "Classical and solid defense"
    },
    {
      name: "Alekhine's Defense",
      eco: "B02",
      moves: ["e4", "Nf6", "e5", "Nd5", "d4", "d6", "Nf3", "Bg4", "Be2", "e6", "O-O", "Be7"],
      description: "Hypermodern provocation"
    },
    {
      name: "Nimzo-Indian Defense",
      eco: "E20",
      moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4", "Qc2", "O-O", "a3", "Bxc3", "Qxc3", "b6"],
      description: "Strategic pin on knight"
    },
    {
      name: "Grünfeld Defense",
      eco: "D80",
      moves: ["d4", "Nf6", "c4", "g6", "Nc3", "d5", "cxd5", "Nxd5", "e4", "Nxc3", "bxc3", "Bg7"],
      description: "Dynamic counterplay against d4"
    },
    {
      name: "Slav Defense",
      eco: "D10",
      moves: ["d4", "d5", "c4", "c6", "Nf3", "Nf6", "Nc3", "dxc4", "a4", "Bf5", "e3", "e6"],
      description: "Solid defense maintaining central pawn"
    },
    {
      name: "Dutch Defense",
      eco: "A80",
      moves: ["d4", "f5", "g3", "Nf6", "Bg2", "e6", "Nf3", "Be7", "O-O", "O-O", "c4", "d6"],
      description: "Aggressive kingside expansion"
    },
    {
      name: "Benoni Defense",
      eco: "A43",
      moves: ["d4", "c5", "d5", "e6", "Nc3", "exd5", "cxd5", "d6", "e4", "g6", "Nf3", "Bg7"],
      description: "Counterattacking pawn structure"
    },
    {
      name: "Budapest Gambit",
      eco: "A51",
      moves: ["d4", "Nf6", "c4", "e5", "dxe5", "Ng4", "Bf4", "Nc6", "Nf3", "Bb4", "Nbd2", "Qe7"],
      description: "Gambit for quick development and attack"
    },
    {
      name: "Benko Gambit",
      eco: "A57",
      moves: ["d4", "Nf6", "c4", "c5", "d5", "b5", "cxb5", "a6", "bxa6", "Bxa6", "Nc3", "d6"],
      description: "Pawn sacrifice for queenside pressure"
    },
    {
      name: "Old Benoni Defense",
      eco: "A43",
      moves: ["d4", "c5", "d5", "e5", "Nc3", "d6", "e4", "Be7", "Nf3", "Bg4", "Be2", "Nf6"],
      description: "Solid closed structure"
    },
    {
      name: "Elephant Trap (QGD)",
      eco: "D51",
      moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Nbd7", "cxd5", "exd5", "Nxd5", "Nxd5", "Bxd8"],
      description: "Trap in Queen's Gambit Declined"
    },
    {
      name: "Fishing Pole Trap (Ruy López)",
      eco: "C65",
      moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "Nf6", "O-O", "Ng4", "h3", "h5", "hxg4", "hxg4"],
      description: "Tactical trap in Ruy López"
    }
  ]
};

const ChessBoard = ({ game, onMove, playerColor }) => {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);

  const board = game.getBoard();
  const currentTurn = game.getTurn();
  const isPlayerTurn = (currentTurn === 'w' && playerColor === 'white') || 
                       (currentTurn === 'b' && playerColor === 'black');

  const handleSquareClick = (row, col) => {
    if (!isPlayerTurn) {
      console.log('Not player turn', { currentTurn, playerColor });
      return;
    }

    const square = String.fromCharCode(97 + col) + (8 - row);
    
    if (selectedSquare) {
      // Check if clicking on another piece of the same color (re-selection)
      const clickedPiece = game.getPiece(square);
      if (clickedPiece && clickedPiece.color === currentTurn) {
        // Just switch selection to the new piece
        setSelectedSquare(square);
        const moves = game.getLegalMoves(square);
        setLegalMoves(moves.map(m => m.to));
        return;
      }
      
      // Otherwise, try to make a move
      const move = {
        from: selectedSquare,
        to: square
      };
      
      const testGame = game.copy();
      const result = testGame.makeMove(move);
      
      if (result) {
        setSelectedSquare(null);
        setLegalMoves([]);
        onMove(move);
        return;
      }
      
      // Invalid move - deselect
      setSelectedSquare(null);
      setLegalMoves([]);
    } else {
      const piece = game.getPiece(square);
      if (piece && piece.color === currentTurn) {
        setSelectedSquare(square);
        const moves = game.getLegalMoves(square);
        setLegalMoves(moves.map(m => m.to));
      }
    }
  };

  const getPieceSymbol = (piece) => {
    if (!piece) return '';
    // White pieces: outlined symbols (naturally light)
    // Black pieces: filled symbols (naturally dark)
    const symbols = {
      w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
      b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' }
    };
    return symbols[piece.color][piece.type];
  };

  const renderBoard = () => {
    const rows = playerColor === 'white' ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
    
    return rows.map((row) => {
      const cols = playerColor === 'white' ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
      
      return (
        <div key={row} className="flex">
          {cols.map((col) => {
            const square = String.fromCharCode(97 + col) + (8 - row);
            const piece = board[row][col];
            const isLight = (row + col) % 2 === 0;
            const isSelected = selectedSquare === square;
            const isLegalMove = legalMoves.includes(square);
            
            return (
              <div
                key={col}
                onClick={() => handleSquareClick(row, col)}
                className={`w-16 h-16 flex items-center justify-center text-5xl cursor-pointer relative
                  ${isLight ? 'bg-amber-100' : 'bg-amber-700'}
                  ${isSelected ? 'ring-4 ring-blue-500' : ''}
                  ${isPlayerTurn ? 'hover:opacity-80' : ''}`}
              >
                {piece && (
                  <span style={{
                    color: piece.color === 'w' ? '#FFFFFF' : '#1a1a1a',
                    filter: piece.color === 'w' 
                      ? 'drop-shadow(0 3px 6px rgba(0,0,0,1)) drop-shadow(0 0 4px rgba(0,0,0,0.9)) drop-shadow(0 0 8px rgba(0,0,0,0.7))' 
                      : 'drop-shadow(0 2px 3px rgba(255,255,255,0.6)) drop-shadow(0 0 3px rgba(255,255,255,0.4))',
                    WebkitTextStroke: piece.color === 'w' ? '1px rgba(0,0,0,0.4)' : 'none',
                    fontWeight: piece.color === 'w' ? '600' : '400'
                  }}>
                    {getPieceSymbol(piece)}
                  </span>
                )}
                {isLegalMove && (
                  <div className="absolute w-4 h-4 bg-green-500 rounded-full opacity-50"></div>
                )}
              </div>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="inline-block border-4 border-gray-800">
      {renderBoard()}
    </div>
  );
};

const App = () => {
  const [gameState, setGameState] = useState('colorSelection');
  const [playerColor, setPlayerColor] = useState(null);
  const [game, setGame] = useState(null);
  const [currentOpening, setCurrentOpening] = useState(null);
  const [openingMoves, setOpeningMoves] = useState([]);
  const [moveCount, setMoveCount] = useState(0);
  const [resultType, setResultType] = useState(null);
  const [failedMove, setFailedMove] = useState(null);
  const [correctMove, setCorrectMove] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);

  const startNewGame = (color) => {
    const newGame = new ChessGame();
    setGame(newGame);
    setPlayerColor(color);
    setMoveCount(0);
    setMoveHistory([]);
    setFailedMove(null);
    setCorrectMove(null);
    
    if (color === 'black') {
      // If player is black, computer plays first with a random opening
      const openingPool = OPENINGS_DATABASE.white;
      const selectedOpening = openingPool[Math.floor(Math.random() * openingPool.length)];
      setCurrentOpening(selectedOpening);
      const moves = selectedOpening.moves.slice();
      setOpeningMoves(moves);
      
      // Make first move immediately
      setTimeout(() => {
        const result = newGame.makeMove(moves[0]);
        if (result) {
          setGame(newGame.copy());
          setMoveHistory(newGame.history());
        }
      }, 500);
    } else {
      // If player is white, wait for their first move to select appropriate defense
      setCurrentOpening(null);
      setOpeningMoves([]);
    }
    
    setGameState('playing');
  };

  const makeComputerMove = (currentGame, moves, moveIndex) => {
    if (moveIndex >= moves.length) return;
    
    const move = moves[moveIndex];
    const result = currentGame.makeMove(move);
    if (result) {
      setGame(currentGame.copy());
      setMoveHistory(prev => [...prev, result.san]);
    }
  };

  const movesMatch = (move1Notation, move2Notation) => {
    // Extract destination square from algebraic notation
    // Handles formats like: e4, exd5, e4xd5, Nf3, Ngf3, O-O, etc.
    const getDest = (notation) => {
      const cleaned = notation.replace(/[+#!?]/g, ''); // Remove check/mate symbols
      if (cleaned === 'O-O' || cleaned === 'O-O-O') return cleaned; // Castling
      const match = cleaned.match(/([a-h][1-8])$/); // Get last square mentioned
      return match ? match[1] : null;
    };
    
    const dest1 = getDest(move1Notation);
    const dest2 = getDest(move2Notation);
    
    return dest1 === dest2 && dest1 !== null;
  };

  const checkPlayerMove = (move) => {
    const gameCopy = game.copy();
    const result = gameCopy.makeMove(move);
    if (!result) return;

    const currentMoveIndex = gameCopy.history().length - 1;
    
    // Update game state immediately with player's move
    setGame(gameCopy);
    setMoveHistory(gameCopy.history());
    
    // If player is White and this is their first move, select an appropriate defense
    if (playerColor === 'white' && currentMoveIndex === 0) {
      const firstMove = result.to;
      let selectedOpening = null;
      
      // Select defense based on White's first move
      if (firstMove === 'e4') {
        const e4Defenses = OPENINGS_DATABASE.black.filter(op => 
          op.moves[0] === 'e4'
        );
        selectedOpening = e4Defenses[Math.floor(Math.random() * e4Defenses.length)];
      } else if (firstMove === 'd4') {
        const d4Defenses = OPENINGS_DATABASE.black.filter(op => 
          op.moves[0] === 'd4'
        );
        selectedOpening = d4Defenses[Math.floor(Math.random() * d4Defenses.length)];
      } else if (firstMove === 'c4') {
        const c4Defenses = OPENINGS_DATABASE.black.filter(op => 
          op.moves[0] === 'c4'
        );
        selectedOpening = c4Defenses.length > 0 
          ? c4Defenses[Math.floor(Math.random() * c4Defenses.length)]
          : OPENINGS_DATABASE.black[0];
      } else {
        selectedOpening = OPENINGS_DATABASE.black[Math.floor(Math.random() * OPENINGS_DATABASE.black.length)];
      }
      
      setCurrentOpening(selectedOpening);
      const newOpeningMoves = selectedOpening.moves.slice();
      setOpeningMoves(newOpeningMoves);
      
      // Make computer's response after a short delay
      setTimeout(() => {
        const nextGame = gameCopy.copy();
        const compResult = nextGame.makeMove(newOpeningMoves[1]);
        if (compResult) {
          setGame(nextGame);
          setMoveHistory(nextGame.history());
          const newMoveCount = Math.ceil(nextGame.history().length / 2);
          setMoveCount(newMoveCount);
        }
      }, 300);
      
      const newMoveCount = Math.ceil(gameCopy.history().length / 2);
      setMoveCount(newMoveCount);
      return;
    }
    
    // For subsequent moves, check if we're still in the opening book
    if (currentMoveIndex < openingMoves.length) {
      const expectedMove = openingMoves[currentMoveIndex];
      const testGame = new ChessGame();
      
      for (let i = 0; i < currentMoveIndex; i++) {
        testGame.makeMove(openingMoves[i]);
      }
      
      const expectedResult = testGame.makeMove(expectedMove);
      
      // Compare moves by destination, not notation string
      const movesAreSame = expectedResult && movesMatch(result.san, expectedResult.san);
      
      // If player deviates, check if there's an alternate opening that matches
      if (!movesAreSame) {
        const currentHistory = gameCopy.history();
        let foundAlternate = false;
        let newOpeningMoves = null;
        
        const openingPool = playerColor === 'white' ? OPENINGS_DATABASE.black : OPENINGS_DATABASE.white;
        
        for (let opening of openingPool) {
          if (opening.moves.length <= currentMoveIndex) continue;
          
          const testGame2 = new ChessGame();
          let matches = true;
          
          for (let i = 0; i <= currentMoveIndex; i++) {
            const testResult = testGame2.makeMove(opening.moves[i]);
            if (!testResult) {
              matches = false;
              break;
            }
            
            // Compare moves by destination, not notation
            const historyMove = currentHistory[i];
            const testMove = testGame2.history()[i];
            
            if (!movesMatch(historyMove, testMove)) {
              matches = false;
              break;
            }
          }
          
          if (matches) {
            setCurrentOpening(opening);
            newOpeningMoves = opening.moves.slice();
            setOpeningMoves(newOpeningMoves);
            foundAlternate = true;
            break;
          }
        }
        
        if (!foundAlternate) {
          setResultType('failure');
          setFailedMove(result.san);
          setCorrectMove(expectedResult ? expectedResult.san : expectedMove);
          setGameState('result');
          return;
        }
        
        // Make computer's move with the new opening
        const nextMoveIndex = currentMoveIndex + 1;
        setTimeout(() => {
          const nextGame = gameCopy.copy();
          let compMove = null;
          
          // Try to use opening book move if available
          if (nextMoveIndex < newOpeningMoves.length) {
            compMove = newOpeningMoves[nextMoveIndex];
          } else {
            // Beyond opening book - if we played all opening moves perfectly, end as success
            const movesPlayed = Math.ceil(nextMoveIndex / 2);
            setMoveCount(movesPlayed);
            setResultType('success');
            setGameState('result');
            return;
          }
          
          if (compMove) {
            const compResult = nextGame.makeMove(compMove);
            if (compResult) {
              setGame(nextGame);
              setMoveHistory(nextGame.history());
              const finalMoveCount = Math.ceil(nextGame.history().length / 2);
              setMoveCount(finalMoveCount);
              if (finalMoveCount >= 10) {
                setTimeout(() => {
                  setResultType('success');
                  setGameState('result');
                }, 500);
              }
            }
          }
        }, 300);
        
        const newMoveCount = Math.ceil(gameCopy.history().length / 2);
        setMoveCount(newMoveCount);
        return;
      }
      
      // Move matches expected opening
      const newMoveCount = Math.ceil(gameCopy.history().length / 2);
      setMoveCount(newMoveCount);
      
      if (newMoveCount >= 10) {
        setResultType('success');
        setGameState('result');
        return;
      }
      
      // Make computer's next move
      const nextMoveIndex = gameCopy.history().length;
      setTimeout(() => {
        const nextGame = gameCopy.copy();
        let compMove = null;
        
        // Try to use opening book move if available
        if (nextMoveIndex < openingMoves.length) {
          compMove = openingMoves[nextMoveIndex];
        } else {
          // Beyond opening book - if we played all opening moves perfectly, end as success
          const movesPlayed = Math.ceil(nextMoveIndex / 2);
          setMoveCount(movesPlayed);
          setResultType('success');
          setGameState('result');
          return;
        }
        
        if (compMove) {
          const compResult = nextGame.makeMove(compMove);
          if (compResult) {
            setGame(nextGame);
            setMoveHistory(nextGame.history());
            const finalMoveCount = Math.ceil(nextGame.history().length / 2);
            setMoveCount(finalMoveCount);
            if (finalMoveCount >= 10) {
              setTimeout(() => {
                setResultType('success');
                setGameState('result');
              }, 500);
            }
          }
        }
      }, 300);
    } else {
      // Beyond opening book - generate computer move
      const newMoveCount = Math.ceil(gameCopy.history().length / 2);
      setMoveCount(newMoveCount);
      
      if (newMoveCount >= 10) {
        setResultType('success');
        setGameState('result');
        return;
      }
      
      setTimeout(() => {
        const nextGame = gameCopy.copy();
        const generatedMove = generateComputerMove(nextGame);
        
        if (generatedMove) {
          const compResult = nextGame.makeMove(generatedMove);
          if (compResult) {
            setGame(nextGame);
            setMoveHistory(nextGame.history());
            const finalMoveCount = Math.ceil(nextGame.history().length / 2);
            setMoveCount(finalMoveCount);
            if (finalMoveCount >= 10) {
              setTimeout(() => {
                setResultType('success');
                setGameState('result');
              }, 500);
            }
          }
        }
      }, 300);
    }
  };

  const handleMove = (move) => {
    checkPlayerMove(move);
  };

  const handleSkip = () => {
    setResultType('skip');
    setGameState('result');
  };

  const handleNextGame = () => {
    setGameState('colorSelection');
    setGame(null);
    setCurrentOpening(null);
    setOpeningMoves([]);
    setResultType(null);
  };

  if (gameState === 'colorSelection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl">
          <h1 className="text-4xl font-bold text-center mb-4 text-slate-800">
            Chess Opening Trainer
          </h1>
          <p className="text-center text-slate-600 mb-8">
            Master chess openings by playing against perfect responses
          </p>
          
          <h2 className="text-2xl font-semibold text-center mb-6 text-slate-700">
            Choose Your Color
          </h2>
          
          <div className="flex gap-6 justify-center">
            <button
              onClick={() => startNewGame('white')}
              className="bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 
                       text-slate-800 px-12 py-8 rounded-xl text-xl font-semibold shadow-lg 
                       transform transition hover:scale-105 border-2 border-slate-300"
            >
              <div className="text-6xl mb-3">♔</div>
              Play as White
            </button>
            
            <button
              onClick={() => startNewGame('black')}
              className="bg-gradient-to-br from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-800 
                       text-white px-12 py-8 rounded-xl text-xl font-semibold shadow-lg 
                       transform transition hover:scale-105 border-2 border-slate-600"
            >
              <div className="text-6xl mb-3">♚</div>
              Play as Black
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'playing' && game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="text-lg font-semibold text-slate-700">
                Playing as: <span className={playerColor === 'white' ? 'text-slate-400' : 'text-slate-900'}>
                  {playerColor === 'white' ? '♔ White' : '♚ Black'}
                </span>
              </div>
              <div className="text-lg font-semibold text-slate-700">
                Moves: {moveCount}/10
              </div>
            </div>
            
            <ChessBoard 
              game={game} 
              onMove={handleMove} 
              playerColor={playerColor}
            />
            
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-slate-600">
                {game.getTurn() === (playerColor === 'white' ? 'w' : 'b') 
                  ? '✓ Your turn' 
                  : '⏳ Computer thinking...'}
              </div>
              <button
                onClick={handleSkip}
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-lg 
                         font-semibold transition"
              >
                Next Game
              </button>
            </div>
          </div>
          
          {moveHistory.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-4 w-full max-w-2xl">
              <h3 className="font-semibold text-slate-700 mb-2">Move History</h3>
              <div className="text-sm text-slate-600 flex flex-wrap gap-2">
                {moveHistory.map((move, idx) => (
                  <span key={idx} className="bg-slate-100 px-2 py-1 rounded">
                    {Math.floor(idx / 2) + 1}{idx % 2 === 0 ? '.' : '...'} {move}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'result') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-3xl">
          <div className="text-center mb-8">
            {resultType === 'success' && (
              <div>
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-green-600 mb-2">Excellent!</h2>
                <p className="text-slate-600 text-lg">You successfully played through 10 moves!</p>
              </div>
            )}
            
            {resultType === 'failure' && (
              <div>
                <div className="text-6xl mb-4">📚</div>
                <h2 className="text-3xl font-bold text-orange-600 mb-2">Learning Opportunity</h2>
                <p className="text-slate-600 text-lg mb-4">You deviated from the opening theory</p>
                {failedMove && (
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-4">
                    <p className="text-slate-700">
                      <span className="font-semibold">Your move:</span> {failedMove}
                    </p>
                    <p className="text-slate-700">
                      <span className="font-semibold">Expected:</span> {correctMove}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {resultType === 'skip' && (
              <div>
                <div className="text-6xl mb-4">⏭️</div>
                <h2 className="text-3xl font-bold text-blue-600 mb-2">Skipped</h2>
                <p className="text-slate-600 text-lg">Moving to next training session</p>
              </div>
            )}
          </div>
          
          {currentOpening && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">
                {currentOpening.name}
              </h3>
              <p className="text-slate-600 mb-2">
                <span className="font-semibold">ECO Code:</span> {currentOpening.eco}
              </p>
              <p className="text-slate-700 italic">
                {currentOpening.description}
              </p>
            </div>
          )}
          
          {moveHistory.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-slate-700 mb-2">Game Moves</h4>
              <div className="text-sm text-slate-600 flex flex-wrap gap-2">
                {moveHistory.map((move, idx) => (
                  <span key={idx} className="bg-white px-2 py-1 rounded shadow-sm">
                    {Math.floor(idx / 2) + 1}{idx % 2 === 0 ? '.' : '...'} {move}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleNextGame}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                       text-white px-8 py-3 rounded-lg text-lg font-semibold shadow-lg 
                       transform transition hover:scale-105"
            >
              Start New Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default App;
