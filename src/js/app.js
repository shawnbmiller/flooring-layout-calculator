// @ts-check
document.addEventListener('DOMContentLoaded', () => {
    const form = /** @type {HTMLFormElement} */ (document.getElementById('calculator-form'));
    const roomLengthInput = /** @type {HTMLInputElement} */ (document.getElementById('room-length'));
    const roomWidthInput = /** @type {HTMLInputElement} */ (document.getElementById('room-width'));
    const plankLengthInput = /** @type {HTMLInputElement} */ (document.getElementById('plank-length'));
    const plankWidthInput = /** @type {HTMLInputElement} */ (document.getElementById('plank-width'));
    const perimeterSpacingInput = /** @type {HTMLInputElement} */ (document.getElementById('perimeter-spacing'));

    if (!form || !roomLengthInput || !roomWidthInput || !plankLengthInput || !plankWidthInput || !perimeterSpacingInput) return;

    console.log('Calculator App Loaded');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const roomLength = parseFloat(roomLengthInput.value) * 12;
        const roomWidth = parseFloat(roomWidthInput.value) * 12;
        const plankLength = parseFloat(plankLengthInput.value);
        const plankWidth = parseFloat(plankWidthInput.value);
        const perimeterSpacing = parseFloat(perimeterSpacingInput.value);
        // time how long the calculation takes and display it in the results
        var startTime = performance.now();
        let layout = findLayout(roomLength, roomWidth, plankLength, plankWidth, perimeterSpacing);
        var endTime = performance.now();
        var calculationTime = endTime - startTime;

        let totalResults = 0;
        layout.forEach((rowTwoOptions) => {
            totalResults += rowTwoOptions.length;
        });

        // limit results to the 3 best options. Compare the starting lengths of adjacent rows and choose the options with the largest minimum difference
        // (this is to maximize stagger)
        /**
         * @type {{ rowOne: any; rowTwo: any; minDiff: number; }[]}
         */
        let combinations = [];
        layout.forEach((rowTwoOptions, rowOne) => {
            rowTwoOptions.forEach((/** @type {{ startingLength: any; leftover: any; }} */ rowTwo) => {
                let row1Start = rowOne.startingLength;
                let row2Start = rowTwo.startingLength;
                let row3Start = rowOne.leftover;
                let row4Start = rowTwo.leftover;
                let diff1 = calculateStaggerDiff(row1Start, row2Start, plankLength);
                let diff2 = calculateStaggerDiff(row2Start, row3Start, plankLength);
                let diff3 = calculateStaggerDiff(row3Start, row4Start, plankLength);
                let minDiff = Math.min(diff1, diff2, diff3);
                combinations.push({ rowOne, rowTwo, minDiff });
            });
        });
        combinations.sort((a, b) => b.minDiff - a.minDiff);
        // select top 3 combinations with at least 3 inches difference in starting lengths
        let topCombinations = [];
        let selectedStartingLengths = [];
        for (let combo of combinations) {
            let startingLength = combo.rowOne.startingLength;
            let isFarEnough = selectedStartingLengths.every(selected => Math.abs(startingLength - selected) >= 3);
            if (isFarEnough) {
                topCombinations.push(combo);
                selectedStartingLengths.push(startingLength);
                if (topCombinations.length >= 3) break;
            }
        }
        let newLayout = new Map();
        topCombinations.forEach(({ rowOne, rowTwo }) => {
            if (!newLayout.has(rowOne)) {
                newLayout.set(rowOne, []);
            }
            newLayout.get(rowOne).push(rowTwo);
        });
        layout = newLayout;

        // Display layout options
        const layoutDiv = document.getElementById('layout-visualization');
        if (layoutDiv) {
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
            layoutDiv.appendChild(table);

            // Create diagrams for all combinations
            const diagramsContainer = document.createElement('div');
            diagramsContainer.id = 'diagrams-container';
            combinationIndex = 0; // Reset for diagram indexing
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
                const layoutFigure = document.createElement('figure');
                layoutFigure.classList.add('layout-diagram');
                layoutFigure.dataset.combinationIndex = index.toString();
                if (index !== 0) layoutFigure.style.display = 'none'; // Hide all except first
                
                const diagramDiv = document.createElement('div');
                diagramDiv.classList.add('diagram-container');
                const scale = window.innerWidth / roomLength; // Scale factor to make diagram fill the page width
                diagramDiv.style.width = `${roomLength * scale}px`;
                diagramDiv.style.height = `${(plankWidth * 5 + perimeterSpacing * 2) * scale}px`;
                // draw perimeter spacing
                const perimeterDiv = document.createElement('div');
                perimeterDiv.classList.add('perimeter-spacing', 'perimeter-spacing-top');
                perimeterDiv.style.height = `${perimeterSpacing * scale}px`;
                diagramDiv.appendChild(perimeterDiv);
                const perimeterBottomDiv = document.createElement('div');
                perimeterBottomDiv.classList.add('perimeter-spacing', 'perimeter-spacing-bottom');
                perimeterBottomDiv.style.height = `${perimeterSpacing * scale}px`;
                diagramDiv.appendChild(perimeterBottomDiv);
                
                const rows = [rowOne, rowTwo];
                // calculate rows 3, 4, and 5 based on leftovers
                for (let i = 2; i < 5; i++) {
                    const previousRow = rows[i - 2];
                    const leftover = previousRow.leftover;
                    const planks = calculateRowPlanks(roomLength - (2 * perimeterSpacing), plankLength, leftover);
                    rows.push({
                        startingLength: leftover,
                        planks: planks,
                        leftover: plankLength - planks[planks.length - 1]
                    });
                }
                
                // draw rows
                for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                    const row = rows[rowIndex];
                    let currentX = perimeterSpacing * scale;
                    const yPosition = (perimeterSpacing + (rowIndex * plankWidth)) * scale;
                    for (let plankLengthIn of row.planks) {
                        const plankDiv = document.createElement('div');
                        plankDiv.classList.add('plank');
                        plankDiv.style.left = `${currentX}px`;
                        plankDiv.style.top = `${yPosition}px`;
                        plankDiv.style.width = `${plankLengthIn * scale}px`;
                        plankDiv.style.height = `${plankWidth * scale}px`;
                        plankDiv.style.backgroundColor = `hsl(${(rowIndex * 60) % 360}, 70%, 80%)`;
                        plankDiv.textContent = `${plankLengthIn.toFixed(3)}"`;
                        diagramDiv.appendChild(plankDiv);
                        currentX += plankLengthIn * scale;
                    }
                }
                
                layoutFigure.appendChild(diagramDiv);
                const sampleDiagramCaption = document.createElement("figcaption");
                sampleDiagramCaption.textContent = `Layout Diagram (Option ${index + 1}, first 5 rows)`;
                layoutFigure.appendChild(sampleDiagramCaption);
                diagramsContainer.appendChild(layoutFigure);
            });

            layoutDiv.appendChild(diagramsContainer);

            // Add event listeners to radio buttons
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
        else {
            console.error('Layout visualization div not found');
        }

    });
});

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
     * layout rules:
     * - each rows planks lengths must add up to the room length minus perimeter spacing on both sides
     * - planks must be staggered at least 12 inches
     * - rows must start with at least 8 inches of plank
     * - maintain perimeter spacing from walls
     * - rows 1 and 2 can start with a fractional plank, but whatever isn't used is discarded
     * - subsequent rows start with the leftover end piece from 2 rows before
     */

    var rowLength = roomLength - (2 * (perimeterSpacing));
    const maxStagger = plankLength / 2;
    const minStagger = 12;
    const minStartingLength = 8;

    let rowOneStartingLengths = [];
    for (let len = minStartingLength; len <= plankLength; len += 0.125) {
        rowOneStartingLengths.push(len);
    }

    let rowOnePlanksOptions = [];
    for (let startingLength of rowOneStartingLengths) {
        let planks = calculateRowPlanks(rowLength, plankLength, startingLength);
        rowOnePlanksOptions.push({
            startingLength: startingLength,
            planks: planks,
            leftover: plankLength - planks[planks.length - 1]
        });
    }
    console.log('Initial row one options:', JSON.stringify(rowOnePlanksOptions, null, 2));
    // elmininate any options where the leftover piece is less than minStartingLength
    rowOnePlanksOptions = rowOnePlanksOptions.filter(option => option.leftover >= minStartingLength)
    // eliminate any options where the last plank is less than 2 inches
    rowOnePlanksOptions = rowOnePlanksOptions.filter(option => option.planks[option.planks.length - 1] >= 2);
    // calculate row three options based on lefterovers from row one, and eliminate row one if row three leftover is less than minStartingLength
    let rowOneEliminations = [];
    for (let option of rowOnePlanksOptions) {
        let rowOneLeftover = option.leftover;
        let planks = calculateRowPlanks(rowLength, plankLength, rowOneLeftover);
        let rowThreeLeftover = plankLength - planks[planks.length - 1];
        if (rowThreeLeftover < minStartingLength) {
            rowOneEliminations.push(option);
        }
        // eliminate if last plank in row three is less than 2 inches
        if (planks[planks.length - 1] < 2) {
            rowOneEliminations.push(option);
        }
    }
    
    console.log('Row one eliminations:', JSON.stringify(rowOneEliminations, null, 2));
    rowOnePlanksOptions = rowOnePlanksOptions.filter(option => !rowOneEliminations.includes(option));

    console.log('Row one options:', JSON.stringify(rowOnePlanksOptions, null, 2));

    // map row one options to row two options
    let rowOneMap = new Map();

    // row 2 can start with any length that is at least minStartingLength and at most plankLength
    // row 2 starting lengths must be staggered from row 1 starting lengths and leftovers by at least minStagger
    for (let option of rowOnePlanksOptions) {
        let rowOneStartingLength = option.startingLength;
        let rowOneLeftover = option.leftover;
        // if row one is is less than minStagger + minStartingLength, row two must be greater than row one + minStagger
        let rowTwoMinStartingLength = (rowOneStartingLength < (minStagger + minStartingLength)) ? (rowOneStartingLength + minStagger) : minStartingLength;
        // if row one leftover is less than minStagger + minStartingLength, row two must be greater than leftover + minStagger
        let rowTwoMinStartingLengthFromLeftover = (rowOneLeftover < (minStagger + minStartingLength)) ? (rowOneLeftover + minStagger) : minStartingLength;
        if (rowTwoMinStartingLengthFromLeftover > rowTwoMinStartingLength) {
            rowTwoMinStartingLength = rowTwoMinStartingLengthFromLeftover;
        }
        // if row one starting length is greater than plankLength - minStagger, row two must be less than row one - minStagger
        let rowTwoMaxStartingLength = (rowOneStartingLength > (plankLength - minStagger)) ? (rowOneStartingLength - minStagger) : plankLength;
        // if row one leftover is greater than plankLength - minStagger, row two must be less than leftover - minStagger
        let rowTwoMaxStartingLengthFromLeftover = (rowOneLeftover > (plankLength - minStagger)) ? (rowOneLeftover - minStagger) : plankLength;
        if (rowTwoMaxStartingLengthFromLeftover < rowTwoMaxStartingLength) {
            rowTwoMaxStartingLength = rowTwoMaxStartingLengthFromLeftover;
        }

        let rowTwoStartingLengths = [];
        for (let len = rowTwoMinStartingLength; len <= rowTwoMaxStartingLength; len += 0.125) {
            // Ensure row two starting length differs from row one starting length by at least minStagger
            // Also ensure row two starting length differs from row one leftover (row 3's starting length) by at least minStagger
            if (calculateStaggerDiff(len, rowOneStartingLength, plankLength) >= minStagger
                && calculateStaggerDiff(len, rowOneLeftover, plankLength) >= minStagger) {
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
        // elmininate any options where the leftover piece is less than minStartingLength or less than min stagger from row one leftover
        rowTwoPlanksOptions = rowTwoPlanksOptions.filter(option => option.leftover >= minStartingLength
            && calculateStaggerDiff(option.leftover, rowOneLeftover, plankLength) >= minStagger);
        // eliminate any options where the last plank is less than 2 inches
        rowTwoPlanksOptions = rowTwoPlanksOptions.filter(option => option.planks[option.planks.length - 1] >= 2);

        // calculate row four options based on lefterovers from row two, and eliminate row two if row four leftover is less than minStartingLength
        let rowTwoEliminations = [];
        for (let option2 of rowTwoPlanksOptions) {
            let rowTwoLeftover = option2.leftover;
            let planks = calculateRowPlanks(rowLength, plankLength, rowTwoLeftover);
            let rowFourLeftover = plankLength - planks[planks.length - 1];
            if (rowFourLeftover < minStartingLength) {
                rowTwoEliminations.push(option2);
            }
            // eliminate if last plank in row four is less than 2 inches
            if (planks[planks.length - 1] < 2) {
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
    let planks = [];
    let currentLength = startingLength;
    planks.push(startingLength);
    while (currentLength < rowLength) {
        let remaining = rowLength - currentLength;
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