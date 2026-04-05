"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface DownloadDropdownItemProps {
  reportId: string
  label?: string
}

export function DownloadDropdownItem({
  reportId,
  label = "Download"
}: DownloadDropdownItemProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = async () => {
    setIsLoading(true)
    try {
      const downloadUrl = `/api/reports/${reportId}/download`
      const response = await fetch(downloadUrl)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Download failed: ${response.status} ${errorText}`)
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `report_${reportId}.pdf`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/)
        if (match) filename = match[1]
      }
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      setIsLoading(false)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Failed to download report', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenuItem onSelect={handleDownload} disabled={isLoading} className="flex items-center">
      {isLoading ? (
        <>
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Downloading...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </DropdownMenuItem>
  )
}