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
        layout.forEach((rowTwoOptions, rowOneOption) => {
            totalResults += rowTwoOptions.length;
        });

        console.log('Calculated layout:', layout);
        // Display layout options
        const layoutDiv = document.getElementById('layout-visualization');
        if (layoutDiv) {
            layoutDiv.innerHTML = '';
            layoutDiv.innerHTML += `<h3>Found ${totalResults} layout options</h3>`;
            layoutDiv.innerHTML += `<p>Calculation Time: ${calculationTime.toFixed(2)} ms</p>`;
            const table = document.createElement('table');
            table.style.borderCollapse = 'collapse';
            table.style.width = '100%';
            
            // Create header row
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            ['Row 1 Start (in)', 'Row 2 Start (in)', 'Row 1 Leftover (in)', 'Row 2 Leftover (in)'].forEach(text => {
                const th = document.createElement('th');
                th.textContent = text;
                th.style.border = '1px solid #ccc';
                th.style.padding = '8px';
                th.style.textAlign = 'left';
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // Create body rows
            const tbody = document.createElement('tbody');
            layout.forEach((rowTwoOptions, rowOneOption) => {
                rowTwoOptions.forEach((/** @type {{ startingLength: number; leftover: number; }} */ rowTwoOption) => {
                    const tr = document.createElement('tr');
                    [
                        rowOneOption.startingLength.toFixed(2),
                        rowTwoOption.startingLength.toFixed(2),
                        rowOneOption.leftover.toFixed(2),
                        rowTwoOption.leftover.toFixed(2)
                    ].forEach(value => {
                        const td = document.createElement('td');
                        td.textContent = value;
                        td.style.border = '1px solid #ccc';
                        td.style.padding = '8px';
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });
            });
            table.appendChild(tbody);
            layoutDiv.appendChild(table);
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
    for (let len = minStartingLength; len <= plankLength; len += 0.25) {
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
    // eliminate any options where the last plank is less than 3 inches
    rowOnePlanksOptions = rowOnePlanksOptions.filter(option => option.planks[option.planks.length - 1] >= 3);
    // calculate row three options based on lefterovers from row one, and eliminate row one if row three leftover is less than minStartingLength
    let rowOneEliminations = [];
    for (let option of rowOnePlanksOptions) {
        let rowOneLeftover = option.leftover;
        let planks = calculateRowPlanks(rowLength, plankLength, rowOneLeftover);
        let rowThreeLeftover = plankLength - planks[planks.length - 1];
        if (rowThreeLeftover < minStartingLength) {
            rowOneEliminations.push(option);
        }
        // eliminate if last plank in row three is less than 3 inches
        if (planks[planks.length - 1] < 3) {
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
        for (let len = rowTwoMinStartingLength; len <= rowTwoMaxStartingLength; len += 0.25) {
            rowTwoStartingLengths.push(len);
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
        rowTwoPlanksOptions = rowTwoPlanksOptions.filter(option => option.leftover >= minStartingLength && Math.abs(option.leftover - rowOneLeftover) >= minStagger);
        // eliminate any options where the last plank is less than 3 inches
        rowTwoPlanksOptions = rowTwoPlanksOptions.filter(option => option.planks[option.planks.length - 1] >= 3);

        // calculate row four options based on lefterovers from row two, and eliminate row two if row four leftover is less than minStartingLength
        let rowTwoEliminations = [];
        for (let option2 of rowTwoPlanksOptions) {
            let rowTwoLeftover = option2.leftover;
            let planks = calculateRowPlanks(rowLength, plankLength, rowTwoLeftover);
            let rowFourLeftover = plankLength - planks[planks.length - 1];
            if (rowFourLeftover < minStartingLength) {
                rowTwoEliminations.push(option2);
            }
            // eliminate if last plank in row four is less than 3 inches
            if (planks[planks.length - 1] < 3) {
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