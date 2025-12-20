// File upload size limits (in bytes)
export const FILE_SIZE_LIMITS = {
    pdf: 10 * 1024 * 1024, // 10 MB
    image: 5 * 1024 * 1024, // 5 MB
    document: 10 * 1024 * 1024, // 10 MB (DOC, DOCX, TXT, etc.)
    video: 50 * 1024 * 1024, // 50 MB
    other: 10 * 1024 * 1024, // 10 MB
}

export const FILE_CATEGORIES = {
    pre_production: {
        label: 'Pre-Production',
        description: 'Scripts, storyboards, shot lists',
    },
    production: {
        label: 'Production',
        description: 'Raw footage, dailies, BTS',
    },
    post_production: {
        label: 'Post-Production',
        description: 'Edits, graphics, music',
    },
    deliverables: {
        label: 'Deliverables',
        description: 'Final exports, client versions',
    },
    other: {
        label: 'Other',
        description: 'Miscellaneous files',
    },
}

export function getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase()

    if (!extension) return 'other'

    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm']
    const documentExtensions = ['doc', 'docx', 'txt', 'rtf']
    const pdfExtensions = ['pdf']

    if (imageExtensions.includes(extension)) return 'image'
    if (videoExtensions.includes(extension)) return 'video'
    if (documentExtensions.includes(extension)) return 'document'
    if (pdfExtensions.includes(extension)) return 'pdf'

    return 'other'
}

export function getSizeLimit(fileType: string): number {
    return FILE_SIZE_LIMITS[fileType as keyof typeof FILE_SIZE_LIMITS] || FILE_SIZE_LIMITS.other
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export function validateFileSize(file: File): { valid: boolean; error?: string } {
    const fileType = getFileType(file.name)
    const sizeLimit = getSizeLimit(fileType)

    if (file.size > sizeLimit) {
        return {
            valid: false,
            error: `File size exceeds ${formatFileSize(sizeLimit)} limit for ${fileType} files`,
        }
    }

    return { valid: true }
}

export function extractGoogleDriveFileId(url: string): string | null {
    // Extract file ID from various Google Drive URL formats
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /\/folders\/([a-zA-Z0-9_-]+)/,
    ]

    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return match[1]
    }

    return null
}

export function getGoogleDriveEmbedUrl(url: string): string | null {
    const fileId = extractGoogleDriveFileId(url)
    if (!fileId) return null

    return `https://drive.google.com/file/d/${fileId}/preview`
}
