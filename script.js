// --- 1. CORE MATHEMATICAL UTILITIES ---

/**
 * Standard matrix multiplication (A * B).
 */
const matrixMultiply = (A, B) => {
    const rowsA = A.length;
    const colsA = A[0].length;
    const colsB = B[0].length;

    // Check for compatible dimensions
    if (colsA !== B.length) {
        throw new Error("Matrix dimensions are incompatible for multiplication.");
    }

    // Initialize result matrix
    const result = Array(rowsA).fill(0).map(() => Array(colsB).fill(0));

    // Perform multiplication
    for (let i = 0; i < rowsA; i++) {
        for (let j = 0; j < colsB; j++) {
            for (let k = 0; k < colsA; k++) {
                result[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    return result;
};

/**
 * Computes matrix M raised to the power k (M^k) using repeated squaring.
 */
const matrixPower = (M, k) => {
    const n = M.length;
    
    // Identity matrix
    const identity = Array(n).fill(0).map((_, i) => 
        Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
    );

    if (k === 0) return identity;
    if (k === 1) return M;
    
    let result = identity;
    let base = M.map(row => [...row]); // Deep copy
    let exp = k;
    
    while (exp > 0) {
        if (exp % 2 === 1) {
            result = matrixMultiply(result, base);
        }
        base = matrixMultiply(base, base);
        exp = Math.floor(exp / 2);
    }
    
    return result;
};

/**
 * Generates the 1-step Transition Matrix (P) for Gambler's Ruin.
 */
const generateTransitionMatrix = (N, p) => {
    const size = N + 1;
    const matrix = Array(size).fill(0).map(() => Array(size).fill(0));
    const q = 1 - p;

    for (let i = 0; i <= N; i++) {
        if (i === 0 || i === N) {
            // Absorbing states (Ruin and Goal)
            matrix[i][i] = 1;
        } else {
            // Transient states: move to i+1 with p, i-1 with q
            matrix[i][i + 1] = p;
            matrix[i][i - 1] = q;
        }
    }
    return matrix;
};

/**
 * Generates the initial state vector (pi_0).
 */
const generateInitialVector = (N, n) => {
    const vector = Array(N + 1).fill(0);
    if (n >= 0 && n <= N) {
        vector[n] = 1;
    }
    return vector;
};

/**
 * Vector-matrix multiplication (v * M).
 */
const vectorMatrixMultiply = (v, M) => {
    const result = Array(M[0].length).fill(0);
    
    for (let j = 0; j < M[0].length; j++) { // Columns of M (new states)
        for (let i = 0; i < v.length; i++) { // Rows of M (old states)
            result[j] += v[i] * M[i][j];
        }
    }
    return result;
};

const formatNum = (num) => {
    return typeof num === 'number' ? num.toFixed(4) : '0.0000';
};


// --- 2. GLOBAL STATE AND SIMULATION LOGIC ---

let N_global = 5;
let n_global = 3;
let p_global = 0.5;
let currentStep = 0;
let transitionMatrix = [];
let currentVector = [];

/**
 * Gets parameters from DOM inputs.
 */
const getParams = () => {
    N_global = parseInt(document.getElementById('N_goal').value) || 1;
    n_global = parseInt(document.getElementById('n_start').value) || 0;
    p_global = parseFloat(document.getElementById('p_win').value) || 0;

    // Simple bounds check
    if (n_global < 0 || n_global > N_global) n_global = Math.min(Math.max(0, n_global), N_global);
    if (p_global < 0 || p_global > 1) p_global = Math.min(Math.max(0, p_global), 1);
};

/**
 * Resets the simulation state and recalculates the base matrix.
 */
const resetSimulation = () => {
    getParams();

    // 1. Generate base matrix and initial vector
    transitionMatrix = generateTransitionMatrix(N_global, p_global);
    currentVector = generateInitialVector(N_global, n_global);
    currentStep = 0;

    // 2. Update all displays
    updateAllDisplays();
};

/**
 * Advances the simulation by k steps using matrix power.
 */
const advanceSteps = (k) => {
    if (k < 1 || isNaN(k)) k = 1;
    
    // Calculate P^k
    const Pk = matrixPower(transitionMatrix, k);
    
    // Calculate new vector: pi_new = pi_old * P^k
    currentVector = vectorMatrixMultiply(currentVector, Pk);
    currentStep += k;

    // Update displays
    updateAllDisplays();
};


// --- 3. DISPLAY UPDATE FUNCTIONS (DOM Manipulation) ---

/**
 * Renders the state vector table (pi_k).
 */
const renderVectorTable = () => {
    const container = document.getElementById('vectorTableContainer');
    let html = '<table class="vector-table"><thead><tr>';
    
    // Header (States $0 to $N)
    for (let i = 0; i <= N_global; i++) {
        html += `<th>$${i}</th>`;
    }
    html += '</tr></thead><tbody><tr>';

    // Data (Probabilities)
    currentVector.forEach((prob, i) => {
        // Classes are still useful for general styling if needed
        const className = i === 0 ? 'ruin' : i === N_global ? 'goal' : '';
        html += `<td class="${className}">${formatNum(prob)}</td>`;
    });
    
    html += '</tr></tbody></table>';
    container.innerHTML = html;
};

/**
 * Renders the bar chart visualization (Final Fix: Inline Styling for Color).
 */
const renderChart = () => {
    const container = document.getElementById('chartContainer');
    container.innerHTML = ''; // Clears the previous chart
    
    currentVector.forEach((prob, state) => {
        const height = prob * 100; // Height as percentage
        let color = '#007bff'; // Default/Transient color (Blue)

        if (state === 0) {
            color = '#dc3545'; // Ruin color (Red)
        }
        if (state === N_global) {
            color = '#28a745'; // Goal color (Green)
        }

        // 1. Create the Bar Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'bar-wrapper';
        wrapper.title = `State $${state}: ${formatNum(prob)}`;

        // 2. Create the Probability Value Label
        const value = document.createElement('div');
        value.className = 'bar-value';
        value.textContent = `${(prob * 100).toFixed(1)}%`;

        // 3. Create the Actual Bar Element
        const bar = document.createElement('div');
        bar.className = 'bar'; // Only the base class needed for width/transition
        
        // Inline styles for guaranteed visibility
        bar.style.height = `${height}%`; 
        bar.style.backgroundColor = color; // <-- GUARANTEED COLOR

        // 4. Create the State Label
        const label = document.createElement('div');
        label.className = 'bar-label';
        label.textContent = `$${state}`;

        // 5. Assemble and Append
        wrapper.appendChild(value);
        wrapper.appendChild(bar);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    });
};

/**
 * Renders the transition matrix table (P).
 */
const renderTransitionMatrix = () => {
    const container = document.getElementById('transitionMatrixContainer');
    let html = '<table class="vector-table"><thead><tr><th></th>';
    
    // Header (To States)
    for (let i = 0; i <= N_global; i++) {
        html += `<th>$${i}</th>`;
    }
    html += '</tr></thead><tbody>';

    // Rows (From States)
    transitionMatrix.forEach((row, i) => {
        html += `<tr><th>$${i}</th>`;
        row.forEach((val) => {
            html += `<td>${formatNum(val)}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
};

/**
 * Calls all update functions and sets the step count.
 */
const updateAllDisplays = () => {
    document.getElementById('currentStepDisplay').textContent = currentStep;
    
    // 1. Render content first
    renderChart();
    renderVectorTable();
    renderTransitionMatrix();

    // 2. Trigger MathJax re-render for the dynamically inserted content
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
};


// --- 4. INITIALIZATION ---

// Initialize simulation when the script loads
document.addEventListener('DOMContentLoaded', resetSimulation);