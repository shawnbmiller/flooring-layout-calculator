// @ts-check

// Constants
const INCHES_PER_FOOT = 12;
const MIN_STAGGER = 12; // inches
const MIN_STARTING_LENGTH = 8; // inches
const MIN_PLANK_LENGTH = 2; // inches
const MAX_STAGGER_RATIO = 0.5; // plankLength / 2
const STAGGER_INCREMENT = 0.125; // inches
const MIN_DIFFERENCE_FOR_SELECTION = 3; // inches
const MAX_LAYOUT_OPTIONS = 3;
const DIAGRAM_ROWS_TO_SHOW = 5;

/**
 * Initialize the calculator when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    const form = /** @type {HTMLFormElement} */ (document.getElementById('calculator-form'));
    const roomLengthInput = /** @type {HTMLInputElement} */ (document.getElementById('room-length'));
    const roomWidthInput = /** @type {HTMLInputElement} */ (document.getElementById('room-width'));
    const plankLengthInput = /** @type {HTMLInputElement} */ (document.getElementById('plank-length'));
    const plankWidthInput = /** @type {HTMLInputElement} */ (document.getElementById('plank-width'));
    const perimeterSpacingInput = /** @type {HTMLInputElement} */ (document.getElementById('perimeter-spacing'));

    if (!form || !roomLengthInput || !roomWidthInput || !plankLengthInput || !plankWidthInput || !perimeterSpacingInput) {
        console.error('Required form elements not found');
        return;
    }

    console.log('Calculator App Loaded');
    form.addEventListener('submit', handleFormSubmit);
});

/**
 * Handle form submission
 * @param {Event} e - The submit event
 */
function handleFormSubmit(e) {
    e.preventDefault();
    
    const roomLengthInput = /** @type {HTMLInputElement} */ (document.getElementById('room-length'));
    const roomWidthInput = /** @type {HTMLInputElement} */ (document.getElementById('room-width'));
    const plankLengthInput = /** @type {HTMLInputElement} */ (document.getElementById('plank-length'));
    const plankWidthInput = /** @type {HTMLInputElement} */ (document.getElementById('plank-width'));
    const perimeterSpacingInput = /** @type {HTMLInputElement} */ (document.getElementById('perimeter-spacing'));

    if (!roomLengthInput || !roomWidthInput || !plankLengthInput || !plankWidthInput || !perimeterSpacingInput) {
        console.error('Form inputs not found');
        return;
    }

    const roomLength = parseFloat(roomLengthInput.value) * INCHES_PER_FOOT;
    const roomWidth = parseFloat(roomWidthInput.value) * INCHES_PER_FOOT;
    const plankLength = parseFloat(plankLengthInput.value);
    const plankWidth = parseFloat(plankWidthInput.value);
    const perimeterSpacing = parseFloat(perimeterSpacingInput.value);

    if (isNaN(roomLength) || isNaN(roomWidth) || isNaN(plankLength) || isNaN(plankWidth) || isNaN(perimeterSpacing)) {
        alert('Please enter valid numeric values for all fields.');
        return;
    }

    if (roomLength <= 0 || roomWidth <= 0 || plankLength <= 0 || plankWidth <= 0 || perimeterSpacing < 0) {
        alert('Please enter positive values for dimensions.');
        return;
    }

    // Time how long the calculation takes
    const startTime = performance.now();
    const layout = findLayout(roomLength, roomWidth, plankLength, plankWidth, perimeterSpacing);
    const endTime = performance.now();
    const calculationTime = endTime - startTime;

    console.log(`Calculation took ${calculationTime.toFixed(2)} milliseconds`);

    const filteredLayout = filterTopCombinations(layout, plankLength);
    displayLayoutVisualization(filteredLayout, roomLength, plankWidth, perimeterSpacing, plankLength);
}

/**
 * Filter the top combinations based on stagger differences
 * @param {Map<any, any[]>} layout - The layout map
 * @param {number} plankLength - Length of each plank
 * @returns {Map<any, any[]>} Filtered layout with top combinations
 */
function filterTopCombinations(layout, plankLength) {
    let totalResults = 0;
    layout.forEach((rowTwoOptions) => {
        totalResults += rowTwoOptions.length;
    });

    // Limit results to the top options. Compare the starting lengths of adjacent rows and choose the options with the largest minimum difference (to maximize stagger)
    /**
     * @type {{ rowOne: any; rowTwo: any; minDiff: number; }[]}
     */
    const combinations = [];
    layout.forEach((rowTwoOptions, rowOne) => {
        rowTwoOptions.forEach((/** @type {{ startingLength: any; leftover: any; }} */ rowTwo) => {
            const row1Start = rowOne.startingLength;
            const row2Start = rowTwo.startingLength;
            const row3Start = rowOne.leftover;
            const row4Start = rowTwo.leftover;
            const diff1 = calculateStaggerDiff(row1Start, row2Start, plankLength);
            const diff2 = calculateStaggerDiff(row2Start, row3Start, plankLength);
            const diff3 = calculateStaggerDiff(row3Start, row4Start, plankLength);
            const minDiff = Math.min(diff1, diff2, diff3);
            combinations.push({ rowOne, rowTwo, minDiff });
        });
    });
    combinations.sort((a, b) => b.minDiff - a.minDiff);

    // Select top combinations with at least MIN_DIFFERENCE_FOR_SELECTION inches difference in starting lengths
    const topCombinations = [];
    /** @type {number[]} */
    const selectedStartingLengths = [];
    for (const combo of combinations) {
        const startingLength = combo.rowOne.startingLength;
        const isFarEnough = selectedStartingLengths.every(selected => Math.abs(startingLength - selected) >= MIN_DIFFERENCE_FOR_SELECTION);
        if (isFarEnough) {
            topCombinations.push(combo);
            selectedStartingLengths.push(startingLength);
            if (topCombinations.length >= MAX_LAYOUT_OPTIONS) break;
        }
    }

    const newLayout = new Map();
    topCombinations.forEach(({ rowOne, rowTwo }) => {
        if (!newLayout.has(rowOne)) {
            newLayout.set(rowOne, []);
        }
        newLayout.get(rowOne).push(rowTwo);
    });

    return newLayout;
}

/**
 * Display the layout visualization
 * @param {Map<any, any[]>} layout - The filtered layout
 * @param {number} roomLength - Room length in inches
 * @param {number} plankWidth - Plank width in inches
 * @param {number} perimeterSpacing - Perimeter spacing in inches
 * @param {number} plankLength - Plank length in inches
 */
function displayLayoutVisualization(layout, roomLength, plankWidth, perimeterSpacing, plankLength) {
    const layoutDiv = document.getElementById('layout-visualization');
    if (!layoutDiv) {
        console.error('Layout visualization div not found');
        return;
    }

    // Clear previous content
    layoutDiv.innerHTML = '';

    const table = createLayoutTable(layout);
    layoutDiv.appendChild(table);

    const diagramsContainer = createDiagramsContainer(layout, roomLength, plankWidth, perimeterSpacing, plankLength);
    layoutDiv.appendChild(diagramsContainer);

    setupRadioButtonListeners(table, diagramsContainer);
}

/**
 * Create the layout table
 * @param {Map<any, any[]>} layout - The layout map
 * @returns {HTMLTableElement} The created table
 */
function createLayoutTable(layout) {
    const table = document.createElement('table');
    table.classList.add('layout-table');

    // Create header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Select', 'Row 1 Start (in)', 'Row 2 Start (in)', 'Row 3 Start (Row 1 Leftover) (in)', 'Row 4 Start (Row 2 Leftover) (in)'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body rows
    const tbody = document.createElement('tbody');
    let combinationIndex = 0;
    layout.forEach((rowTwoOptions, rowOneOption) => {
        rowTwoOptions.forEach((/** @type {{ startingLength: number; leftover: number; }} */ rowTwoOption) => {
            const tr = document.createElement('tr');
            // Add radio button cell
            const selectTd = document.createElement('td');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'layout-selection';
            radio.value = combinationIndex.toString();
            if (combinationIndex === 0) radio.checked = true; // Default to first option
            selectTd.appendChild(radio);
            tr.appendChild(selectTd);

            [
                rowOneOption.startingLength.toFixed(3),
                rowTwoOption.startingLength.toFixed(3),
                rowOneOption.leftover.toFixed(3),
                rowTwoOption.leftover.toFixed(3)
            ].forEach(value => {
                const td = document.createElement('td');
                td.textContent = value;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
            combinationIndex++;
        });
    });
    table.appendChild(tbody);

    return table;
}

/**
 * Create the diagrams container
 * @param {Map<any, any[]>} layout - The layout map
 * @param {number} roomLength - Room length in inches
 * @param {number} plankWidth - Plank width in inches
 * @param {number} perimeterSpacing - Perimeter spacing in inches
 * @param {number} plankLength - Plank length in inches
 * @returns {HTMLDivElement} The diagrams container
 */
function createDiagramsContainer(layout, roomLength, plankWidth, perimeterSpacing, plankLength) {
    const diagramsContainer = document.createElement('div');
    diagramsContainer.id = 'diagrams-container';

    let combinationIndex = 0;
    /**
     * @type {{ rowOne: any; rowTwo: any; index: number; }[]}
     */
    const combinations = [];
    layout.forEach((rowTwoOptions, rowOneOption) => {
        rowTwoOptions.forEach((/** @type {any} */ rowTwoOption) => {
            combinations.push({ rowOne: rowOneOption, rowTwo: rowTwoOption, index: combinationIndex });
            combinationIndex++;
        });
    });

    combinations.forEach(({ rowOne, rowTwo, index }) => {
        const layoutFigure = createLayoutDiagram(rowOne, rowTwo, index, roomLength, plankWidth, perimeterSpacing, plankLength);
        diagramsContainer.appendChild(layoutFigure);
    });

    return diagramsContainer;
}

/**
 * Create a single layout diagram
 * @param {any} rowOne - Row one data
 * @param {any} rowTwo - Row two data
 * @param {number} index - Diagram index
 * @param {number} roomLength - Room length in inches
 * @param {number} plankWidth - Plank width in inches
 * @param {number} perimeterSpacing - Perimeter spacing in inches
 * @param {number} plankLength - Plank length in inches
 * @returns {HTMLElement} The layout figure
 */
function createLayoutDiagram(rowOne, rowTwo, index, roomLength, plankWidth, perimeterSpacing, plankLength) {
    const layoutFigure = document.createElement('figure');
    layoutFigure.classList.add('layout-diagram');
    layoutFigure.dataset.combinationIndex = index.toString();
    if (index !== 0) layoutFigure.style.display = 'none'; // Hide all except first

    const diagramDiv = document.createElement('div');
    diagramDiv.classList.add('diagram-container');
    const scale = window.innerWidth / roomLength; // Scale factor to make diagram fill the page width
    diagramDiv.style.width = `${roomLength * scale}px`;
    diagramDiv.style.height = `${(plankWidth * DIAGRAM_ROWS_TO_SHOW + perimeterSpacing * 2) * scale}px`;

    // Draw perimeter spacing
    const perimeterDiv = document.createElement('div');
    perimeterDiv.classList.add('perimeter-spacing', 'perimeter-spacing-top');
    perimeterDiv.style.height = `${perimeterSpacing * scale}px`;
    diagramDiv.appendChild(perimeterDiv);

    const perimeterBottomDiv = document.createElement('div');
    perimeterBottomDiv.classList.add('perimeter-spacing', 'perimeter-spacing-bottom');
    perimeterBottomDiv.style.height = `${perimeterSpacing * scale}px`;
    diagramDiv.appendChild(perimeterBottomDiv);

    const rows = [rowOne, rowTwo];
    // Calculate rows 3, 4, and 5 based on leftovers
    for (let i = 2; i < DIAGRAM_ROWS_TO_SHOW; i++) {
        const previousRow = rows[i - 2];
        const leftover = previousRow.leftover;
        const planks = calculateRowPlanks(roomLength - (2 * perimeterSpacing), plankLength, leftover);
        rows.push({
            startingLength: leftover,
            planks: planks,
            leftover: plankLength - planks[planks.length - 1]
        });
    }

    // Draw rows
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        let currentX = perimeterSpacing * scale;
        const yPosition = (perimeterSpacing + (rowIndex * plankWidth)) * scale;
        let plankIndexInRow = 0;
        for (const plankLengthIn of row.planks) {
            const plankDiv = document.createElement('div');
            plankDiv.classList.add('plank');
            plankDiv.style.left = `${currentX}px`;
            plankDiv.style.top = `${yPosition}px`;
            plankDiv.style.width = `${plankLengthIn * scale}px`;
            plankDiv.style.height = `${plankWidth * scale}px`;
            
            // For rows after row 2 (index 2 = row 3), make the starting piece the same color as the row it came from
            // Row 3 (index 2) starting piece comes from Row 1 (index 0)
            // Row 4 (index 3) starting piece comes from Row 2 (index 1)
            // And so on...
            let colorIndex = rowIndex;
            if (rowIndex >= 2 && plankIndexInRow === 0) {
                // Starting piece uses color from the row it came from (2 rows before)
                colorIndex = rowIndex - 2;
            }
            
            plankDiv.style.backgroundColor = `hsl(${(colorIndex * 60) % 360}, 70%, 80%)`;
            plankDiv.textContent = `${plankLengthIn.toFixed(3)}"`;
            diagramDiv.appendChild(plankDiv);
            currentX += plankLengthIn * scale;
            plankIndexInRow++;
        }
    }

    layoutFigure.appendChild(diagramDiv);
    const sampleDiagramCaption = document.createElement("figcaption");
    sampleDiagramCaption.textContent = `Layout Diagram (Option ${index + 1}, first ${DIAGRAM_ROWS_TO_SHOW} rows)`;
    layoutFigure.appendChild(sampleDiagramCaption);

    return layoutFigure;
}

/**
 * Setup event listeners for radio buttons
 * @param {HTMLTableElement} table - The layout table
 * @param {HTMLDivElement} diagramsContainer - The diagrams container
 */
function setupRadioButtonListeners(table, diagramsContainer) {
    const radios = table.querySelectorAll('input[type="radio"][name="layout-selection"]');
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (!(e.target instanceof HTMLInputElement)) return;
            const selectedIndex = e.target.value;
            const diagrams = diagramsContainer.querySelectorAll('.layout-diagram');
            diagrams.forEach(diagram => {
                if (!(diagram instanceof HTMLElement)) return;
                diagram.style.display = diagram.dataset.combinationIndex === selectedIndex ? 'block' : 'none';
            });
        });
    });
}

/**
 * @description Calculate optimal plank layout for given room and plank dimensions
 * @param {number} roomLength 
 * @param {number} roomWidth 
 * @param {number} plankLength 
 * @param {number} plankWidth 
 * @param {number} perimeterSpacing 
 * @returns {Map<any, any>} Map of row one options to row two options
 */
function findLayout(roomLength, roomWidth, plankLength, plankWidth, perimeterSpacing) {
    /**
     * Layout rules:
     * - Each row's planks lengths must add up to the room length minus perimeter spacing on both sides
     * - Planks must be staggered at least MIN_STAGGER inches
     * - Rows must start with at least MIN_STARTING_LENGTH inches of plank
     * - Maintain perimeter spacing from walls
     * - Rows 1 and 2 can start with a fractional plank, but whatever isn't used is discarded
     * - Subsequent rows start with the leftover end piece from 2 rows before
     */

    const rowLength = roomLength - (2 * perimeterSpacing);
    const maxStagger = plankLength * MAX_STAGGER_RATIO;

    const rowOneStartingLengths = [];
    for (let len = MIN_STARTING_LENGTH; len <= plankLength; len += STAGGER_INCREMENT) {
        rowOneStartingLengths.push(len);
    }

    const rowOnePlanksOptions = [];
    for (const startingLength of rowOneStartingLengths) {
        const planks = calculateRowPlanks(rowLength, plankLength, startingLength);
        rowOnePlanksOptions.push({
            startingLength: startingLength,
            planks: planks,
            leftover: plankLength - planks[planks.length - 1]
        });
    }
    console.log('Initial row one options:', JSON.stringify(rowOnePlanksOptions, null, 2));

    // Eliminate any options where the leftover piece is less than MIN_STARTING_LENGTH
    let filteredRowOneOptions = rowOnePlanksOptions.filter(option => option.leftover >= MIN_STARTING_LENGTH);

    // Eliminate any options where the last plank is less than MIN_PLANK_LENGTH inches
    filteredRowOneOptions = filteredRowOneOptions.filter(option => option.planks[option.planks.length - 1] >= MIN_PLANK_LENGTH);

    // Calculate row three options based on leftovers from row one, and eliminate row one if row three leftover is less than MIN_STARTING_LENGTH
    /** @type {any[]} */
    const rowOneEliminations = [];
    for (const option of filteredRowOneOptions) {
        const rowOneLeftover = option.leftover;
        const planks = calculateRowPlanks(rowLength, plankLength, rowOneLeftover);
        const rowThreeLeftover = plankLength - planks[planks.length - 1];
        if (rowThreeLeftover < MIN_STARTING_LENGTH) {
            rowOneEliminations.push(option);
        }
        // Eliminate if last plank in row three is less than MIN_PLANK_LENGTH inches
        if (planks[planks.length - 1] < MIN_PLANK_LENGTH) {
            rowOneEliminations.push(option);
        }
    }

    console.log('Row one eliminations:', JSON.stringify(rowOneEliminations, null, 2));
    filteredRowOneOptions = filteredRowOneOptions.filter(option => !rowOneEliminations.includes(option));

    console.log('Row one options:', JSON.stringify(filteredRowOneOptions, null, 2));

    // Map row one options to row two options
    const rowOneMap = new Map();

    // Row 2 can start with any length that is at least MIN_STARTING_LENGTH and at most plankLength
    // Row 2 starting lengths must be staggered from row 1 starting lengths and leftovers by at least MIN_STAGGER
    for (const option of filteredRowOneOptions) {
        const rowOneStartingLength = option.startingLength;
        const rowOneLeftover = option.leftover;

        // Calculate minimum starting length for row two
        let rowTwoMinStartingLength = (rowOneStartingLength < (MIN_STAGGER + MIN_STARTING_LENGTH)) ? (rowOneStartingLength + MIN_STAGGER) : MIN_STARTING_LENGTH;
        const rowTwoMinFromLeftover = (rowOneLeftover < (MIN_STAGGER + MIN_STARTING_LENGTH)) ? (rowOneLeftover + MIN_STAGGER) : MIN_STARTING_LENGTH;
        if (rowTwoMinFromLeftover > rowTwoMinStartingLength) {
            rowTwoMinStartingLength = rowTwoMinFromLeftover;
        }

        // Calculate maximum starting length for row two
        let rowTwoMaxStartingLength = (rowOneStartingLength > (plankLength - MIN_STAGGER)) ? (rowOneStartingLength - MIN_STAGGER) : plankLength;
        // if row one leftover is greater than plankLength - MIN_STAGGER, row two must be less than leftover - MIN_STAGGER
        const rowTwoMaxFromLeftover = (rowOneLeftover > (plankLength - MIN_STAGGER)) ? (rowOneLeftover - MIN_STAGGER) : plankLength;
        if (rowTwoMaxFromLeftover < rowTwoMaxStartingLength) {
            rowTwoMaxStartingLength = rowTwoMaxFromLeftover;
        }

        const rowTwoStartingLengths = [];
        for (let len = rowTwoMinStartingLength; len <= rowTwoMaxStartingLength; len += STAGGER_INCREMENT) {
            // Ensure row two starting length differs from row one starting length by at least MIN_STAGGER
            // Also ensure row two starting length differs from row one leftover (row 3's starting length) by at least MIN_STAGGER
            if (calculateStaggerDiff(len, rowOneStartingLength, plankLength) >= MIN_STAGGER
                && calculateStaggerDiff(len, rowOneLeftover, plankLength) >= MIN_STAGGER) {
                rowTwoStartingLengths.push(len);
            }
        }

        let rowTwoPlanksOptions = [];
        for (let startingLength of rowTwoStartingLengths) {
            let planks = calculateRowPlanks(rowLength, plankLength, startingLength);
            rowTwoPlanksOptions.push({
                startingLength: startingLength,
                planks: planks,
                leftover: plankLength - planks[planks.length - 1]
            });
        }
        // Eliminate any options where the leftover piece is less than MIN_STARTING_LENGTH or less than MIN_STAGGER from row one leftover
        rowTwoPlanksOptions = rowTwoPlanksOptions.filter(option => option.leftover >= MIN_STARTING_LENGTH
            && calculateStaggerDiff(option.leftover, rowOneLeftover, plankLength) >= MIN_STAGGER);

        // Eliminate any options where the last plank is less than MIN_PLANK_LENGTH inches
        rowTwoPlanksOptions = rowTwoPlanksOptions.filter(option => option.planks[option.planks.length - 1] >= MIN_PLANK_LENGTH);

        // Calculate row four options based on leftovers from row two, and eliminate row two if row four leftover is less than MIN_STARTING_LENGTH
        /** @type {any[]} */
        const rowTwoEliminations = [];
        for (const option2 of rowTwoPlanksOptions) {
            const rowTwoLeftover = option2.leftover;
            const planks = calculateRowPlanks(rowLength, plankLength, rowTwoLeftover);
            const rowFourLeftover = plankLength - planks[planks.length - 1];
            if (rowFourLeftover < MIN_STARTING_LENGTH) {
                rowTwoEliminations.push(option2);
            }
            // Eliminate if last plank in row four is less than MIN_PLANK_LENGTH inches
            if (planks[planks.length - 1] < MIN_PLANK_LENGTH) {
                rowTwoEliminations.push(option2);
            }
        }
        rowTwoPlanksOptions = rowTwoPlanksOptions.filter(option2 => !rowTwoEliminations.includes(option2));
        console.log("Mapped row one option:", JSON.stringify(option, null, 2), "to row two options:", JSON.stringify(rowTwoPlanksOptions, null, 2));
        rowOneMap.set(option, rowTwoPlanksOptions);
    }

    return rowOneMap;
}

/**
 * @param {number} rowLength
 * @param {number} plankLength
 * @param {number} startingLength
 */
function calculateRowPlanks(rowLength, plankLength, startingLength) {
    const planks = [];
    let currentLength = startingLength;
    planks.push(startingLength);
    while (currentLength < rowLength) {
        const remaining = rowLength - currentLength;
        if (remaining >= plankLength) {
            planks.push(plankLength);
            currentLength += plankLength;
        } else {
            planks.push(remaining);
            currentLength += remaining;
        }
    }
    console.log(`Calculated planks for row length ${rowLength} with starting length ${startingLength}:`, planks);
    return planks;
}

/**
 * @param {number} lengthA
 * @param {number} lengthB
 * @param {number} plankLength
 */
function calculateStaggerDiff(lengthA, lengthB, plankLength) {
    const diff = Math.abs(lengthA - lengthB);
    if (diff > plankLength / 2) {
        const shorter = Math.min(lengthA, lengthB);
        const longer = Math.max(lengthA, lengthB);
        return Math.abs((shorter + plankLength) - longer);
    }
    return diff;
}