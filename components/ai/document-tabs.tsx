"use client"

import { useState } from "react"
import { Upload, FileText } from "lucide-react"
import { PdfUploader } from "./pdf-uploader"
import { DocumentGenerator } from "./document-generator"

interface UploadProps {
  initialUploadCount: number
  uploadLimit: number
  maxFileSizeMb: number
  storageDays: number
  planName: string
}

interface GenerateProps {
  initialAnalysisCount: number
  analysisLimit: number
  planName: string
}

interface Props {
  uploadProps: UploadProps
  generateProps: GenerateProps
}

export function AiDocumentTabs({ uploadProps, generateProps }: Props) {
  const [activeTab, setActiveTab] = useState<"upload" | "generate">("upload")

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("upload")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "upload"
              ? "bg-white text-[#1e3a5f] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Upload className="h-4 w-4" />
          PDF 업로드
        </button>
        <button
          onClick={() => setActiveTab("generate")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "generate"
              ? "bg-white text-[#1e3a5f] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <FileText className="h-4 w-4" />
          설명자료 생성
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "upload" ? (
        <PdfUploader {...uploadProps} />
      ) : (
        <DocumentGenerator {...generateProps} />
      )}
    </div>
  )
}
