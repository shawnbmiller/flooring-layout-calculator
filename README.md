# Flooring Layout Calculator

A single-page application for calculating optimal plank flooring layouts. It helps users find valid staggered plank arrangements based on room dimensions, plank sizes, and installation rules.

## Features

- Input room dimensions (length and width in feet)
- Input plank dimensions (length and width in inches)
- Configurable perimeter spacing (expansion gap)
- Calculates all valid layout options following flooring installation rules:
  - Planks staggered at least 12 inches between rows
  - Rows start with at least 8 inches of plank
  - End pieces at least 3 inches long
  - Leftover pieces reused in subsequent rows
- Displays results in a table with calculation time

## Project Structure

```
flooring-layout-calculator
├── src
│   ├── index.html         # Main HTML document for the application
│   ├── css
│   │   └── styles.css     # Styles for the application
│   └── js
│       └── app.js         # Application logic and layout calculations
├── package.json           # Configuration file for npm
└── README.md              # Documentation for the project
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd flooring-layout-calculator
   ```

3. Install the dependencies:
   ```
   npm install
   ```

## Usage

1. Start the development server:
   ```
   npm run start
   ```

2. Enter room dimensions (length and width in feet)
3. Enter plank dimensions (length and width in inches)
4. Set the perimeter spacing (default 0.25 inches)
5. Click "Calculate" to see all valid layout options
6. Results show Row 1 and Row 2 starting lengths with their leftover pieces

## License

This project is licensed under the MIT License.