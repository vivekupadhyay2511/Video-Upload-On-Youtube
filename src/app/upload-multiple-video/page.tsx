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

  const generateAiContentForRow = async (index: number, initialTitle: string) => {
    const maxRetries = 3;

    updateRow(index, { titleStatus: 'processing', descriptionStatus: 'processing' });
    let aiGenerated = false;
    let aiRetries = 0;

    while (!aiGenerated && aiRetries < maxRetries) {
      try {
        const response = await fetch("/api/ai/generate-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `You are a YouTube SEO expert. Based ON THIS TITLE: "${initialTitle}", return ONLY a raw JSON object with two keys: "title" and "description". Do not use markdown blocks like \`\`\`json. Do not include any other text. Escape any double quotes inside the description. "title" must be a highly creative viral YouTube title (MAX 100 characters) with 2-3 new trending hashtags. "description" must be an engaging description with 15-20 trending hashtags. All generated hashtags MUST be strictly lowercase.`
          }),
        });
        const data = await response.json();
        
        if (data.title && data.description && !data.error) {
          updateRow(index, { 
            title: data.title, 
            titleStatus: 'completed',
            description: data.description,
            descriptionStatus: 'completed'
          });
          aiGenerated = true;
        } else {
          aiRetries++;
          if (aiRetries >= maxRetries) {
            if (data.description && !data.error) {
              updateRow(index, { titleStatus: 'error', description: data.description, descriptionStatus: 'completed' });
            } else {
              updateRow(index, { titleStatus: 'error', descriptionStatus: 'error' });
            }
          }
          else await new Promise(r => setTimeout(r, 1000));
        }
      } catch {
        aiRetries++;
        if (aiRetries >= maxRetries) updateRow(index, { titleStatus: 'error', descriptionStatus: 'error' });
        else await new Promise(r => setTimeout(r, 1000));
      }
    }
  };

  const generateAllContent = async () => {
    setGlobalLoading("Processing All Content...");
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].videoLink) continue;

      // Step 1: Download Video
      updateRow(i, { videoStatus: 'processing' });
      let currentTitle = rows[i].title || "";
      try {
        const dResponse = await fetch("/api/download-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceUrl: rows[i].videoLink }),
        });
        const dData = await dResponse.json();

        if (dData.success) {
          currentTitle = dData.title || currentTitle || ("Video " + rows[i].srNo);
          updateRow(i, {
            videoStatus: 'completed',
            previewUrl: dData.previewUrl,
            title: currentTitle
          });
          
          // Generate AI content using our reusable function
          await generateAiContentForRow(i, currentTitle);
        } else {
          updateRow(i, { videoStatus: 'error', message: dData.message });
          if (currentTitle) {
            await generateAiContentForRow(i, currentTitle);
          }
        }
      } catch (error) {
        console.error("Row processing error:", error);
        updateRow(i, { videoStatus: 'error', message: 'Process failed' });
      }
    }
    setGlobalLoading(null);
  };

  const redownloadRowVideo = async (index: number) => {
    const row = rows[index];
    if (!row.videoLink) return;

    updateRow(index, { videoStatus: 'processing', previewUrl: undefined });
    try {
      const dResponse = await fetch("/api/download-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl: row.videoLink }),
      });
      const dData = await dResponse.json();

      if (dData.success) {
        updateRow(index, {
          videoStatus: 'completed',
          previewUrl: dData.previewUrl,
          title: dData.title || row.title || ("Video " + row.srNo)
        });
      } else {
        updateRow(index, { videoStatus: 'error', message: dData.message });
      }
    } catch (error) {
      console.error("Row video redownload error:", error);
      updateRow(index, { videoStatus: 'error', message: 'Download failed' });
    }
  };

  const regenerateRowAi = async (index: number) => {
    const row = rows[index];
    // Use the latest title from the state
    const currentTitle = row.title || ("Video " + row.srNo);
    
    // Clear previous statuses to show it's starting fresh
    updateRow(index, { titleStatus: 'idle', descriptionStatus: 'idle' });
    
    await generateAiContentForRow(index, currentTitle);
  };

  const uploadRowToYoutube = async (index: number) => {
    const row = rows[index];
    if (!row.videoLink || !row.previewUrl) return;
    
    updateRow(index, { uploadStatus: 'processing', message: 'Uploading...' });

    try {
      const uploadTitle = String(row.title || "").trim();
      const isScheduled = row.visibilityType === 'Schedule';
      const response = await fetch("/api/process-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: String(row.videoLink),
          title: uploadTitle.length >= 3 ? uploadTitle : `Video ${row.srNo}`,
          description: String(row.description || ""),
          privacyStatus: isScheduled ? 'private' : 'public',
          scheduleDate: isScheduled ? String(row.scheduleDate || "") : "",
          scheduleTime: isScheduled ? String(row.scheduleTime || "") : ""
        }),
      });
      const data = await response.json();
      if (data.success) {
        updateRow(index, { uploadStatus: 'completed', message: 'Uploaded' });
      } else {
        updateRow(index, { uploadStatus: 'error', message: data.message });
      }
    } catch {
      updateRow(index, { uploadStatus: 'error', message: 'Upload failed' });
    }
  };

  const uploadAllToYoutube = async () => {
    setGlobalLoading("Uploading to YouTube...");
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].videoLink || !rows[i].previewUrl) continue;
      // Skip already uploaded
      if (rows[i].uploadStatus === 'completed') continue;
      
      await uploadRowToYoutube(i);
    }
    setGlobalLoading(null);
  };

  const reuploadRow = (index: number) => {
    uploadRowToYoutube(index);
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
              <button className="premium-ai-btn" style={{ minWidth: '220px' }} onClick={generateAllContent} disabled={!!globalLoading}>
                {globalLoading === "Processing All Content..." ? "⏳ Processing..." : "✨ Generate All Content"}
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
                  <th>Actions</th>
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
                    <td>
                       <div className="action-buttons">
                         <button 
                           className="redownload-btn" 
                           title="Redownload Video"
                           onClick={() => redownloadRowVideo(index)}
                         >
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                             <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                             <polyline points="7 10 12 15 17 10" />
                             <line x1="12" y1="15" x2="12" y2="3" />
                           </svg>
                         </button>
                         <button 
                           className="reload-btn" 
                           title="Regenerate Title & Description"
                           onClick={() => regenerateRowAi(index)}
                         >
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                             <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                             <path d="M3 3v5h5" />
                           </svg>
                         </button>
                         <button 
                           className="reupload-btn" 
                           title="Upload / Reupload to YouTube"
                           onClick={() => reuploadRow(index)}
                         >
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                             <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                             <polyline points="17 8 12 3 7 8" />
                             <line x1="12" y1="3" x2="12" y2="15" />
                           </svg>
                         </button>
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
          // max-width: 1200px !important;
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
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5;
          backdrop-filter: blur(3px);
          border-radius: 20px;
        }

        .ai-loader-small {
          width: 25px;
          height: 25px;
          border: 4px solid rgba(124, 58, 237, 0.3);
          border-radius: 50%;
          border-top-color: #7c3aed;
          animation: ai-spin 0.8s linear infinite;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .reload-btn, .reupload-btn, .redownload-btn {
          background: rgba(124, 58, 237, 0.1);
          border: 1px solid rgba(124, 58, 237, 0.2);
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 1rem;
          color: #fff;
        }

        .reupload-btn {
          background: rgba(22, 163, 74, 0.1);
          border-color: rgba(22, 163, 74, 0.2);
        }

        .redownload-btn {
          background: rgba(59, 130, 246, 0.1);
          border-color: rgba(59, 130, 246, 0.2);
        }

        .reload-btn:hover:not(:disabled) {
          background: rgba(124, 58, 237, 0.2);
          border-color: #7c3aed;
          transform: rotate(180deg);
        }

        .reupload-btn:hover:not(:disabled) {
          background: rgba(22, 163, 74, 0.2);
          border-color: #16a34a;
          transform: translateY(-2px);
        }

        .redownload-btn:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.2);
          border-color: #3b82f6;
          transform: translateY(2px);
        }

        .reload-btn:disabled, .reupload-btn:disabled, .redownload-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .placeholder-text {
          color: var(--muted);
          font-style: italic;
        }
      `}</style>
    </main>
  );
}
