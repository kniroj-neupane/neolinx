import pdf from 'pdf-parse';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Create an object to map fields to specific columns
const columnMapping = {
  "Name": 'B', // Name goes to column B
  "Date of Birth": 'B', // Date of Birth goes to column C
  "Visa": 'B', // Visa Type goes to column D
  "Stream": 'B', // Stream goes to column E
  "Date of Grant": 'B', // Date of Grant goes to column F
  "Visa Grant Number": 'B', // Visa Grant Number goes to column G
  "Passport(or other travel documet) Number": 'B', // Passport Number goes to column H
  "Passport (or other travel document) Country": 'B', // Passport Country goes to column I
  "Application Id": 'B', // Application ID goes to column J
  "Transaction Reference Number": 'B', // Transaction Reference goes to column K
  "Visa Conditions": 'D', // Visa Conditions goes to column L
};
// Utility function to convert column letter (e.g. 'A', 'B', 'C') to column index (e.g. 0, 1, 2)
function columnLetterToIndex(letter: string): number {
  let index = 0;
  const letters = letter.split('');
  for (let i = 0; i < letters.length; i++) {
    index = index * 26 + (letters[i].charCodeAt(0) - 65 + 1);
  }
  return index - 1; // Convert to zero-based index
}
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Get the file from the request
    const { file, selectedFields } = req.body;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    // Convert base64 to buffer
    const buffer = Buffer.from(file, 'base64');

    // Extract text from PDF
    const data = await pdf(buffer);
    const text = data.text;
    const extractedData: Record<string, string> = {};

    // Split the text into sections based on section headers
    const sections = extractSections(text);
    // Regular expressions to extract values from each section
    const regexPatterns: Record<string, RegExp> = {
      "Name": /Name([^\n]+)/,
      "Date of Birth": /Date of birth([^\n]+)/,
      "Visa": /Visa([^\n]+)/, // This should now match within the Visa Summary section
      "Stream": /Stream([^\n]+)/,
      "Date of Grant": /Date of grant([^\n]+)/,
      "Visa Grant Number": /Visa grant number(\d+)/,
      "Passport(or other travel document) Number": /Passport \(or other travel[\s\S]*?document\) number[\s\S]*?(\d+)/,
      "Passport(or other travel document) Country": /Passport \(or other travel[\s\S]*?document\) country[\s\S]*?([A-Za-z]+)/,
      "Application Id": /Application ID(\d+)/,
      "Transaction Reference Number": /Transaction reference number(\w+)/,
    };

    // Extract values for each section using regex patterns
    let visaConditions = extractVisaConditions(sections.visaConditions);

    // Apply regex to the visa summary section
    for (const key in regexPatterns) {
      const match = sections.visaSummary.match(regexPatterns[key]);
      extractedData[key] = match ? match[1].trim() : 'N/A';
    }

    // here go through each extractedData and make sure that it doesn't contain any of the keys of the regesPatterns
    // Create Excel file
    const worksheetData = [['Field', 'Value']];
    let rowIndex = 1; // Start after the header row

    // Add data based on selected fields
    for (const [field, isSelected] of Object.entries(selectedFields)) {
      if (isSelected && extractedData[field]) {
        const column = columnMapping[field] || 'B'; // Default to column B if not defined
        const colIndex = columnLetterToIndex(column); // Convert column letter to index
        worksheetData[rowIndex] = worksheetData[rowIndex] || [];

        // Assign the field name and value to the right column
        worksheetData[rowIndex][colIndex - 1] = field;
        worksheetData[rowIndex][colIndex] = extractedData[field];

        rowIndex++; // Move to the next row
      }
    }
    rowIndex = 1;
    // Assuming visaConditions is a string like "8501 - Maintain health insurance, 8558 - Maximum 12 months stay in 18 months, 8101 - No work, 8201 - Maximum three months study"
    if (selectedFields["Visa Conditions"] && visaConditions) {
      // Split the visaConditions by commas to separate each condition
      const visaConditionArray = visaConditions.split(',').map((condition) => condition.trim()); // Trim spaces around each condition
      worksheetData[0][3] = 'Visa Conditions';
      // Loop through each visa condition and add it to a new row in the worksheet
      visaConditionArray.forEach((condition, index) => {
        const column = columnMapping.visaConditions || 'D'; // Default to column D if not defined
        const colIndex = columnLetterToIndex(column); // Convert column letter to index
        worksheetData[rowIndex] = worksheetData[rowIndex] || [];

        // Assign each condition to the appropriate row and column
        worksheetData[rowIndex][colIndex] = condition;

        rowIndex++; // Move to the next row after each condition
      });
    }

    // Create the worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Create the workbook and append the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Visa Details');

    // Define the file path where the Excel file will be saved
    const filePath = path.join(process.cwd(), 'public', 'visa-details.xlsx');

    // Write the workbook to the file
    XLSX.writeFile(workbook, filePath);

    res.status(200).json({ message: 'Success', fileUrl: '/visa-details.xlsx' });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// Helper function to extract text for each section
function extractSections(text: string) {
  // Define the section headers to split on
  const sectionHeaders = ['Visa conditions', 'Visa duration and travel', 'Visa summary', 'Why keep this notice?'];

  // Initialize the sections object
  const sections = {
    visaSummary: '',
    visaConditions: '',
    visaDurationAndTravel: '',
    whyKeepThisNotice: '',
  };

  // Loop over the section headers and extract content up to the next header
  sectionHeaders.forEach((sectionHeader, index) => {
    // Create a regex pattern to capture the section content
    const nextHeader = sectionHeaders[index + 1] || ''; // Next section header or empty string for last section
    const sectionRegex = new RegExp(`${sectionHeader}[\\s\\S]*?(?=(?:${nextHeader}|$))`, 'g');

    const match = text.match(sectionRegex);
    if (match) {
      const sectionContent = match[0].replace(sectionHeader, '').trim(); // Remove the section header itself
      // Assign to the correct section
      if (sectionHeader === 'Visa summary') {
        sections.visaSummary = sectionContent;
      } else if (sectionHeader === 'Visa conditions') {
        sections.visaConditions = sectionContent;
      } else if (sectionHeader === 'Visa duration and travel') {
        sections.visaDurationAndTravel = sectionContent;
      }
    }
  });

  return sections;
}

// Helper function to extract visa conditions from the Visa conditions section
function extractVisaConditions(visaConditionsSection: string) {
  const visaConditionsMatches = [...visaConditionsSection.matchAll(/\b(\d{4})\s*-\s*([^\n]+)/g)];
  return visaConditionsMatches.length ? visaConditionsMatches.map((m) => `${m[1]} - ${m[2].trim()}`).join(', ') : 'N/A';
}
