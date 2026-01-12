import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'

interface UploadedFile {
  name: string
  file: File
  sheetName: string
}

function App() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const xlsxFiles = Array.from(selectedFiles).filter(
      file => file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    )

    const newFiles: UploadedFile[] = xlsxFiles.map(file => ({
      name: file.name,
      file,
      sheetName: file.name.replace(/\.(xlsx|xls)$/i, '')
    }))

    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateSheetName = useCallback((index: number, newName: string) => {
    setFiles(prev => prev.map((f, i) =>
      i === index ? { ...f, sheetName: newName } : f
    ))
  }, [])

  const mergeAndDownload = useCallback(async () => {
    if (files.length === 0) return

    setIsProcessing(true)

    try {
      const newWorkbook = XLSX.utils.book_new()

      for (const uploadedFile of files) {
        const arrayBuffer = await uploadedFile.file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })

        // 각 파일의 첫 번째 시트를 가져옴
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // 시트 이름 중복 방지
        let sheetName = uploadedFile.sheetName.slice(0, 31) // Excel 시트 이름 최대 31자
        let counter = 1
        while (newWorkbook.SheetNames.includes(sheetName)) {
          const suffix = `_${counter}`
          sheetName = uploadedFile.sheetName.slice(0, 31 - suffix.length) + suffix
          counter++
        }

        XLSX.utils.book_append_sheet(newWorkbook, worksheet, sheetName)
      }

      // 다운로드
      XLSX.writeFile(newWorkbook, 'merged.xlsx')
    } catch (error) {
      console.error('파일 병합 중 오류:', error)
      alert('파일 병합 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }, [files])

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
          XLSX 파일 병합기
        </h1>
        <p className="text-gray-600 mb-8 text-center">
          여러 Excel 파일을 하나의 파일로 병합합니다
        </p>

        {/* 파일 업로드 영역 */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-white'
            }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <input
            id="fileInput"
            type="file"
            multiple
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-gray-600 mb-1">
            파일을 드래그하거나 클릭하여 업로드
          </p>
          <p className="text-gray-400 text-sm">.xlsx, .xls 파일만 가능</p>
        </div>

        {/* 업로드된 파일 목록 */}
        {files.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              업로드된 파일 ({files.length}개)
            </h2>
            <div className="space-y-3">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
                      <path d="M8 13h3v1H8v-1zm0 2h6v1H8v-1zm0 2h6v1H8v-1z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 truncate">{file.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <label className="text-xs text-gray-400">시트 이름:</label>
                      <input
                        type="text"
                        value={file.sheetName}
                        onChange={(e) => updateSheetName(index, e.target.value)}
                        className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        maxLength={31}
                      />
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                    className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                    title="삭제"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* 병합 버튼 */}
            <button
              onClick={mergeAndDownload}
              disabled={isProcessing || files.length === 0}
              className={`mt-6 w-full py-3 px-4 rounded-lg font-medium text-white transition-colors
                ${isProcessing || files.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  처리 중...
                </span>
              ) : (
                `${files.length}개 파일 병합 및 다운로드`
              )}
            </button>

            {/* 초기화 버튼 */}
            <button
              onClick={() => setFiles([])}
              className="mt-3 w-full py-2 px-4 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              전체 삭제
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
