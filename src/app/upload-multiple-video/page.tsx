"use client";

import { useState, useRef } from "react";
import { BulkVideoRow, parseExcelFile, generateSampleExcel } from "@/lib/excel-utils";

export default function BulkUploadPage() {
  const [rows, setRows] = useState<BulkVideoRow[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [globalLoading, setGlobalLoading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsReading(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsedRows = parseExcelFile(buffer);
      setRows(parsedRows);
    } catch (error) {
      console.error("Error reading excel:", error);
      alert("Failed to read Excel file. Please use the sample format.");
    } finally {
      setIsReading(false);
    }
  };

  const handleDownloadSample = () => {
    generateSampleExcel();
  };

  const updateRow = (index: number, updates: Partial<BulkVideoRow>) => {
    setRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], ...updates };
      return newRows;
    });
  };

  const generateVideos = async () => {
    setGlobalLoading("Downloading Videos...");
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].videoLink) continue;
      updateRow(i, { videoStatus: 'processing' });
      
      try {
        const response = await fetch("/api/download-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceUrl: rows[i].videoLink }),
        });
        const data = await response.json();
        if (data.success) {
          updateRow(i, { 
            videoStatus: 'completed', 
            previewUrl: data.previewUrl, 
            title: data.title 
          });
        } else {
          updateRow(i, { videoStatus: 'error', message: data.message });
        }
      } catch {
        updateRow(i, { videoStatus: 'error' });
      }
    }
    setGlobalLoading(null);
  };

  const generateTitles = async () => {
    setGlobalLoading("Generating AI Titles...");
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].title) continue;
      updateRow(i, { titleStatus: 'processing' });
      
      try {
        const response = await fetch("/api/ai/generate-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            prompt: `Generate a catchy, viral YouTube title (MAX 100 characters) including 2-3 hashtags at the end for: "${rows[i].title}"` 
          }),
        });
        const data = await response.json();
        if (data.title) {
          updateRow(i, { title: data.title, titleStatus: 'completed' });
        }
      } catch (error) {
        console.error(error);
        updateRow(i, { titleStatus: 'error' });
      }
    }
    setGlobalLoading(null);
  };

  const generateDescriptions = async () => {
    setGlobalLoading("Generating AI Descriptions...");
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].title) continue;
      updateRow(i, { descriptionStatus: 'processing' });
      
      try {
        const response = await fetch("/api/ai/generate-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            prompt: `Generate a viral YouTube description with 15-20 trending hashtags for: "${rows[i].title}"` 
          }),
        });
        const data = await response.json();
        if (data.description) {
          updateRow(i, { description: data.description, descriptionStatus: 'completed' });
        }
      } catch (error) {
        console.error(error);
        updateRow(i, { descriptionStatus: 'error' });
      }
    }
    setGlobalLoading(null);
  };

  const uploadAllToYoutube = async () => {
    setGlobalLoading("Uploading to YouTube...");
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].videoLink || !rows[i].previewUrl) continue;
      updateRow(i, { uploadStatus: 'processing', message: 'Uploading...' });
      
      try {
        const uploadTitle = String(rows[i].title || "").trim();
        const response = await fetch("/api/process-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            sourceUrl: String(rows[i].videoLink),
            title: uploadTitle.length >= 3 ? uploadTitle : `Video ${rows[i].srNo}`,
            description: String(rows[i].description || ""),
            privacyStatus: rows[i].visibilityType === 'Publish' ? 'public' : 'private',
            scheduleDate: String(rows[i].scheduleDate || ""),
            scheduleTime: String(rows[i].scheduleTime || "")
          }),
        });
        const data = await response.json();
        if (data.success) {
          updateRow(i, { uploadStatus: 'completed', message: 'Uploaded' });
        } else {
          updateRow(i, { uploadStatus: 'error', message: data.message });
        }
      } catch {
        updateRow(i, { uploadStatus: 'error', message: 'Upload failed' });
      }
    }
    setGlobalLoading(null);
  };

  return (
    <main className="page-shell">
      <section className="hero-card bulk-container animate-fade-in">
        <h1 className="gradient-text" style={{ textAlign: 'center', marginBottom: '2rem' }}>Upload Multiple Video</h1>
        
        <div className="bulk-controls">
          <div className="upload-zone glassmorphism" onClick={() => fileInputRef.current?.click()}>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload}
            />
            <div className="upload-placeholder">
              <span style={{ fontSize: '2rem' }}>📁</span>
              <p>{isReading ? "Reading file..." : "Click or Drag Excel file here to upload"}</p>
            </div>
          </div>
          
          <div className="action-row" style={{ flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button className="secondary-btn" onClick={handleDownloadSample}>📥 Download Sample Excel</button>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0, textAlign: 'center', maxWidth: '600px' }}>
              Download this sample to add multiple video links and visibility settings. 
              <strong> Note:</strong> If Visibility Type is set to <strong>Schedule</strong>, you must also provide the Date and Time.
            </p>
          </div>
          
          {rows.length > 0 && (
            <div className="action-row">
              <button className="premium-ai-btn" onClick={generateVideos} disabled={!!globalLoading}>
                {globalLoading === "Downloading Videos..." ? "⏳ Downloading..." : "✨ Generate Video"}
              </button>
              <button className="premium-ai-btn" onClick={generateTitles} disabled={!!globalLoading}>
                {globalLoading === "Generating AI Titles..." ? "⏳ Generating..." : "✨ Generate Title"}
              </button>
              <button className="premium-ai-btn" onClick={generateDescriptions} disabled={!!globalLoading}>
                {globalLoading === "Generating AI Descriptions..." ? "⏳ Generating..." : "✨ Generate Description"}
              </button>
              <button className="primary-action" style={{ background: '#16a34a', minWidth: '180px' }} onClick={uploadAllToYoutube} disabled={!!globalLoading}>
                {globalLoading === "Uploading to YouTube..." ? "⏳ Uploading..." : "🚀 Upload All to YouTube"}
              </button>
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <div className="table-wrapper animate-scale-up">
            <table className="bulk-table">
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Video Link</th>
                  <th>Visibility</th>
                  <th>Schedule</th>
                  <th>YouTube Video</th>
                  <th>YouTube Title</th>
                  <th>YouTube Description</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className={row.uploadStatus}>
                    <td>{row.srNo}</td>
                    <td className="truncate-cell" title={row.videoLink}>{row.videoLink}</td>
                    <td>{row.visibilityType}</td>
                    <td>{row.scheduleDate} {row.scheduleTime}</td>
                    <td style={{ position: 'relative' }}>
                      {row.videoStatus === 'processing' ? (
                        <div className="cell-loader-overlay"><span className="ai-loader-small"></span></div>
                      ) : row.previewUrl ? (
                        <video src={row.previewUrl} className="table-preview" controls />
                      ) : (
                        <span className="placeholder-text">No Video</span>
                      )}
                    </td>
                    <td style={{ position: 'relative' }}>
                      {row.titleStatus === 'processing' && <div className="cell-loader-overlay"><span className="ai-loader-small"></span></div>}
                      <textarea 
                        className="table-input" 
                        value={row.title || ""} 
                        onChange={(e) => updateRow(index, { title: e.target.value })}
                        placeholder="Pending..."
                      />
                    </td>
                    <td style={{ position: 'relative' }}>
                      {row.descriptionStatus === 'processing' && <div className="cell-loader-overlay"><span className="ai-loader-small"></span></div>}
                      <textarea 
                        className="table-input" 
                        value={row.description || ""} 
                        onChange={(e) => updateRow(index, { description: e.target.value })}
                        placeholder="Pending..."
                      />
                    </td>
                    <td>
                      <div className={`status-badge ${row.uploadStatus}`}>
                        {row.uploadStatus === 'processing' && <span className="ai-loader-small"></span>}
                        {row.message || "Idle"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style jsx>{`
        .bulk-container {
          max-width: 860px !important;
          width: 100% !important;
        }

        .bulk-controls {
          display: grid;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .upload-zone {
          border: 2px dashed rgba(124, 58, 237, 0.4);
          border-radius: 20px;
          padding: 3rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .upload-zone:hover {
          background: rgba(124, 58, 237, 0.05);
          border-color: #7c3aed;
        }

        .action-row {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .table-wrapper {
          overflow-x: auto;
          margin-top: 2rem;
          border-radius: 12px;
          border: 1px solid var(--line);
        }

        .bulk-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .bulk-table th {
          background: rgba(0,0,0,0.05);
          padding: 12px;
          text-align: left;
          border-bottom: 2px solid var(--line);
        }

        .bulk-table td {
          padding: 12px;
          border-bottom: 1px solid var(--line);
          vertical-align: top;
        }

        .truncate-cell {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .table-preview {
          width: 120px;
          height: 70px;
          border-radius: 8px;
          background: #000;
        }

        .table-input {
          width: 100%;
          min-width: 150px;
          background: transparent;
          border: 1px solid var(--line);
          border-radius: 6px;
          padding: 8px;
          font-size: 0.8rem;
          resize: vertical;
          min-height: 60px;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          font-size: 0.75rem;
          padding: 4px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .status-badge.processing { color: #7c3aed; }
        .status-badge.completed { color: #16a34a; }
        .status-badge.error { color: #dc2626; }

        .cell-loader-overlay {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5;
          backdrop-filter: blur(1px);
        }

        .ai-loader-small {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(124, 58, 237, 0.3);
          border-radius: 50%;
          border-top-color: #7c3aed;
          animation: ai-spin 0.8s linear infinite;
        }

        .placeholder-text {
          color: var(--muted);
          font-style: italic;
        }
      `}</style>
    </main>
  );
}
