import { Loader2 } from "lucide-react";
import { useState } from "react";
import styled from "styled-components";

export default function Extract() {
  const [file, setFile] = useState<File | null>(null);
  const [downloadLink, setDownloadLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState({
    "Name": true,
    "Date of Birth": true,
    "Visa": true,
    "Stream"  : true,
    "Date of Grant": true,
    "Visa Grant Number": true,
    "Passport(or other travel document) Number": true,
    "Passport(or other travel document) Country": true,
    "Application Id": true,
    "Transaction Reference Number": true,
    "Visa Conditions": true,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSelectedFields((prevFields) => ({
      ...prevFields,
      [name]: checked,
    }));
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file!");

    setLoading(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Data = reader.result?.toString().split(",")[1];

      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64Data, selectedFields: selectedFields }),
      });

      const data = await response.json();
      setLoading(false);

      if (data.fileUrl) {
        setDownloadLink(data.fileUrl);
      } else {
        alert("Error processing file");
      }
    };
  };

  return (
    <Container>
      <Card>
        <Title>Upload PDF & Extract to Excel</Title>
        <Input type="file" accept="application/pdf" onChange={handleFileChange} />
        {file && <FileName>Selected: {file.name}</FileName>}

        <Form>
          <h2>Select Fields to Extract</h2>
          <CheckboxLabel>
            <input
              type="checkbox"
              name="Name"
              checked={selectedFields["Name"]}
              onChange={handleFieldChange}
            />
            Name
          </CheckboxLabel>
          <CheckboxLabel>
            <input
              type="checkbox"
              name="Date of Birth"
              checked={selectedFields["Date of Birth"]} // Make sure this matches the key
              onChange={handleFieldChange}
            />
            Date of Birth
          </CheckboxLabel>
          <CheckboxLabel>
            <input
              type="checkbox"
              name="Visa"
              checked={selectedFields["Visa"]}
              onChange={handleFieldChange}
            />
            Visa
          </CheckboxLabel>
          <CheckboxLabel>
            <input
              type="checkbox"
              name="Stream"
              checked={selectedFields["Stream"]}
              onChange={handleFieldChange}
            />
            Stream
          </CheckboxLabel>
          <CheckboxLabel>
            <input
              type="checkbox"
              name="Date of Grant"
              checked={selectedFields["Date of Grant"]}
              onChange={handleFieldChange}
            />
            Date of Grant
          </CheckboxLabel>
          <CheckboxLabel>
            <input
              type="checkbox"
              name="Visa Grant Number"
              checked={selectedFields["Visa Grant Number"]}
              onChange={handleFieldChange}
            />
            Visa Grant Number
          </CheckboxLabel>
          <CheckboxLabel>
            <input
              type="checkbox"
              name="Passport(or other travel document) Number"
              checked={selectedFields["Passport(or other travel document) Number"]}
              onChange={handleFieldChange}
            />
            Passport Number
          </CheckboxLabel>
          <CheckboxLabel>
            <input
              type="checkbox"
              name="Passport(or other travel document) Country"
              checked={selectedFields["Passport(or other travel document) Country"]}
              onChange={handleFieldChange}
            />
            Passport Country
          </CheckboxLabel>
          <CheckboxLabel>
            <input
              type="checkbox"
              name="Application Id"
              checked={selectedFields["Application Id"]}
              onChange={handleFieldChange}
            />
            Application ID
          </CheckboxLabel>
          <CheckboxLabel>
            <input
              type="checkbox"
              name="Transaction Reference Number"
              checked={selectedFields["Transaction Reference Number"]}
              onChange={handleFieldChange}
            />
            Transaction Reference
          </CheckboxLabel>
          <CheckboxLabel>
            <input
              type="checkbox"
              name="Visa Conditions"
              checked={selectedFields["Visa Conditions"]}
              onChange={handleFieldChange}
            />
            Visa Conditions
          </CheckboxLabel>
        </Form>

        <UploadButton onClick={handleUpload} disabled={loading}>
          {loading ? <Loader2 className="icon" size={18} /> : "Upload & Extract"}
        </UploadButton>

        {downloadLink && (
          <DownloadLink href={downloadLink} download="output.xlsx">
            Download Extracted Excel
          </DownloadLink>
        )}
      </Card>
    </Container>
  );
}

// Styled Components
const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: rgb(var(--background));
  padding: 20px;
`;

const Card = styled.div`
  width: 100%;
  max-width: 400px;
  background: rgb(var(--cardBackground));
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 20px;
  color: rgb(var(--text));
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid rgb(var(--secondary));
  border-radius: 6px;
  background-color: rgb(var(--inputBackground));
  color: rgb(var(--text));
`;

const FileName = styled.p`
  font-size: 16px;
  color: rgb(var(--textPrimary));
  margin-top: 10px;
`;

const Form = styled.div`
  margin-top: 20px;
  text-align: left;
  font-size: 16px;

  h2 {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 10px;
  }
`;

const CheckboxLabel = styled.label`
  display: block;
  font-size: 16px;
  margin-bottom: 8px;

  input {
    margin-right: 8px;
  }
`;

const UploadButton = styled.button`
  width: 100%;
  padding: 12px;
  margin-top: 16px;
  font-size: 16px;
  font-weight: 500;
  color: white;
  background: rgb(var(--primary));
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;

  &:hover {
    background: rgb(var(--primary));
  }

  &:disabled {
    background: rgb(var(--secondary));
    cursor: not-allowed;
  }

  .icon {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    100% {
      transform: rotate(360deg);
    }
  }
`;

const DownloadLink = styled.a`
  display: block;
  margin-top: 16px;
  font-size: 14px;
  color: rgb(var(--primary));
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;
