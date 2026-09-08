/**
 * 長除法核心邏輯 — 純函式，無 DOM 依賴
 */

export function generateProblem(digitCount = 3, divisorMin = 2) {
  const divisor = Math.floor(Math.random() * (10 - divisorMin)) + divisorMin; // divisorMin-9
  const min = Math.pow(10, digitCount - 1);     // e.g. 1000 for 4-digit
  const max = Math.pow(10, digitCount) - 1;     // e.g. 9999 for 4-digit
  const dividend = Math.floor(Math.random() * (max - min + 1)) + min;
  return { dividend, divisor };
}

export function calculateSteps(dividend, divisor) {
  const digits = String(dividend).split('').map(Number);
  const rounds = [];
  let carry = 0;

  for (let i = 0; i < digits.length; i++) {
    const currentNumber = carry * 10 + digits[i];
    const quotientDigit = Math.floor(currentNumber / divisor);
    const product = quotientDigit * divisor;
    const subtractResult = currentNumber - product;
    rounds.push({ currentNumber, quotientDigit, product, subtractResult });
    carry = subtractResult;
  }

  const quotient = rounds.reduce((acc, r) => acc * 10 + r.quotientDigit, 0);
  const remainder = carry;

  return { quotient, remainder, rounds };
}

export function generateLayout(steps, dividend, divisor) {
  const cells = [];
  const dividendDigits = String(dividend).split('').map(Number);
  let order = 0;

  // Column mapping: col 0 = divisor, col 1-3 = digit positions
  // Row 0: quotient row
  // Row 1: dividend row
  // Row 2+: alternating product/subtract rows per round

  // Divisor (row 1, col 0)
  cells.push({ row: 1, col: 0, value: divisor, type: 'divisor', fillable: false });

  // Dividend digits (row 1, col 1-3)
  dividendDigits.forEach((d, i) => {
    cells.push({ row: 1, col: i + 1, value: d, type: 'dividend', fillable: false });
  });

  // Process each round
  for (let r = 0; r < steps.rounds.length; r++) {
    const round = steps.rounds[r];
    const colStart = r + 1; // each round shifts right by 1

    // Quotient digit (row 0)
    cells.push({
      row: 0, col: colStart, value: round.quotientDigit,
      type: 'quotient', fillable: true, order: order++,
    });

    // Product digits (row 2 + r*2)
    const productRow = 2 + r * 2;
    const productDigits = splitNumber(round.product, round.currentNumber);
    productDigits.forEach((d, i) => {
      cells.push({
        row: productRow, col: colStart + i - (productDigits.length - 1),
        value: d, type: 'product', fillable: true, order: order++,
        roundIndex: r,
      });
    });

    // Subtract result digits (row 3 + r*2)
    const subtractRow = 3 + r * 2;
    // For subtract result, we need to figure out how many digits to show
    // If it's the last round, just show the remainder digit(s)
    // If not last round, show subtract result + brought-down digit
    if (r < steps.rounds.length - 1) {
      // Subtract result + bring down next digit
      const nextDigit = dividendDigits[r + 1];
      const combined = round.subtractResult * 10 + nextDigit;
      const combinedDigits = splitForSubtract(round.subtractResult, nextDigit, colStart);

      combinedDigits.forEach((d, i) => {
        const isLastDigit = i === combinedDigits.length - 1;
        cells.push({
          row: subtractRow, col: colStart + i - (combinedDigits.length - 1) + 1,
          value: d, type: isLastDigit ? 'bringdown' : 'subtract',
          fillable: true, order: order++,
          roundIndex: r,
        });
      });
    } else {
      // Final remainder
      const remainderDigits = splitNumber(round.subtractResult, round.currentNumber);
      remainderDigits.forEach((d, i) => {
        cells.push({
          row: subtractRow, col: colStart + i - (remainderDigits.length - 1),
          value: d, type: 'subtract', fillable: true, order: order++,
          roundIndex: r,
        });
      });
    }
  }

  return { cells, totalRows: 3 + (steps.rounds.length - 1) * 2 + 1 };
}

export function validateInput(cell, digit) {
  return cell.value === digit;
}

// Split a number to match the width implied by currentNumber
function splitNumber(num, reference) {
  const refLen = String(reference).length;
  const numStr = String(num).padStart(refLen, '0');
  return numStr.split('').map(Number);
}

// For subtract row: subtractResult digits + bringdown digit
function splitForSubtract(subtractResult, nextDigit, colStart) {
  if (subtractResult === 0) {
    return [0, nextDigit];
  }
  const subDigits = String(subtractResult).split('').map(Number);
  return [...subDigits, nextDigit];
}
