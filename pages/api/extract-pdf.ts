import xlsx from 'node-xlsx';
import pdf from 'pdf-parse';
import fs from 'fs';
import path from 'path';

// Create an object to map fields to specific columns
const columnMapping = {
  "Name": 'B',
  "Date of Birth": 'B',
  "Visa": 'B',
  "Stream": 'B',
  "Date of Grant": 'B',
  "Visa Grant Number": 'B',
  "Passport(or other travel document) Number": 'B',
  "Passport (or other travel document) Country": 'B',
  "Application Id": 'B',
  "Transaction Reference Number": 'B',
  "Visa Conditions": 'D',
};

// Utility function to convert column letter to index
function columnLetterToIndex(letter) {
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 65 + 1);
  }
  return index - 1;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { file, selectedFields } = req.body;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const buffer = Buffer.from(file, 'base64');

    // Extract text from PDF
    const data = await pdf(buffer);
    const text = data.text;
    const extractedData = {};

    // Extract sections
    const sections = extractSections(text);

    // Define regex patterns
    const regexPatterns = {
      "Name": /Name([^\n]+)/,
      "Date of Birth": /Date of birth([^\n]+)/,
      "Visa": /Visa([^\n]+)/,
      "Stream": /Stream([^\n]+)/,
      "Date of Grant": /Date of grant([^\n]+)/,
      "Visa Grant Number": /Visa grant number(\d+)/,
      "Passport(or other travel document) Number": /Passport \(or other travel[\s\S]*?document\) number[\s\S]*?(\d+)/,
      "Passport (or other travel document) Country": /Passport \(or other travel[\s\S]*?document\) country[\s\S]*?([A-Za-z]+)/,
      "Application Id": /Application ID(\d+)/,
      "Transaction Reference Number": /Transaction reference number(\w+)/,
    };

    let visaConditions = extractVisaConditions(sections.visaConditions);

    // Extract values from visa summary
    for (const key in regexPatterns) {
      const match = sections.visaSummary.match(regexPatterns[key]);
      extractedData[key] = match ? match[1].trim() : 'N/A';
    }

    // Prepare data for Excel
    const worksheetData = [['Field', 'Value']];
    let rowIndex = 1;

    for (const [field, isSelected] of Object.entries(selectedFields)) {
      if (isSelected && extractedData[field]) {
        const column = columnMapping[field] || 'B';
        const colIndex = columnLetterToIndex(column);
        worksheetData[rowIndex] = worksheetData[rowIndex] || [];
        worksheetData[rowIndex][colIndex - 1] = field;
        worksheetData[rowIndex][colIndex] = extractedData[field];
        rowIndex++;
      }
    }

    if (selectedFields["Visa Conditions"] && visaConditions) {
      const visaConditionArray = visaConditions.split(',').map((condition) => condition.trim());
      worksheetData[0][3] = 'Visa Conditions';
      visaConditionArray.forEach((condition, index) => {
        const colIndex = columnLetterToIndex(columnMapping["Visa Conditions"] || 'D');
        worksheetData[rowIndex] = worksheetData[rowIndex] || [];
        worksheetData[rowIndex][colIndex] = condition;
        rowIndex++;
      });
    }

    // Create the Excel buffer
    const bufferXLSX = xlsx.build([{ name: 'Visa Details', data: worksheetData }]);

    // Define file path
    const filePath = path.join(process.cwd(), 'public', 'visa-details.xlsx');

    // Save the file
    fs.writeFileSync(filePath, bufferXLSX);

    res.status(200).json({ message: 'Success', fileUrl: '/visa-details.xlsx' });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// Helper function to extract text sections
function extractSections(text) {
  const sectionHeaders = ['Visa conditions', 'Visa duration and travel', 'Visa summary', 'Why keep this notice?'];

  const sections = {
    visaSummary: '',
    visaConditions: '',
    visaDurationAndTravel: '',
    whyKeepThisNotice: '',
  };

  sectionHeaders.forEach((sectionHeader, index) => {
    const nextHeader = sectionHeaders[index + 1] || '';
    const sectionRegex = new RegExp(`${sectionHeader}[\\s\\S]*?(?=(?:${nextHeader}|$))`, 'g');
    const match = text.match(sectionRegex);
    if (match) {
      const sectionContent = match[0].replace(sectionHeader, '').trim();
      if (sectionHeader === 'Visa summary') sections.visaSummary = sectionContent;
      else if (sectionHeader === 'Visa conditions') sections.visaConditions = sectionContent;
      else if (sectionHeader === 'Visa duration and travel') sections.visaDurationAndTravel = sectionContent;
    }
  });

  return sections;
}

// Helper function to extract visa conditions
function extractVisaConditions(visaConditionsSection) {
  const visaConditionsMatches = [...visaConditionsSection.matchAll(/\b(\d{4})\s*-\s*([^\n]+)/g)];
  return visaConditionsMatches.length ? visaConditionsMatches.map((m) => `${m[1]} - ${m[2].trim()}`).join(', ') : 'N/A';
}
