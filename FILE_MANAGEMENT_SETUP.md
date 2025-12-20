# File Management Setup Guide

## Step 1: Run Database Migration

1. Go to your Supabase SQL Editor: https://supabase.com/dashboard/project/frinqtylwgzquoxvqhxb/sql/new
2. Copy the contents of `supabase/migrations/006_add_project_files.sql`
3. Paste and run it in the SQL Editor

## Step 2: Create Storage Bucket

1. Go to Supabase Storage: https://supabase.com/dashboard/project/frinqtylwgzquoxvqhxb/storage/buckets
2. Click "New bucket"
3. Name: `project-files`
4. Set to **Public** (so files can be accessed via URL)
5. Click "Create bucket"

## Step 3: Set Storage Policies

After creating the bucket, click on it and go to "Policies":

### Allow Authenticated Users to Upload
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files');
```

### Allow Authenticated Users to Read
```sql
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-files');
```

### Allow Authenticated Users to Delete
```sql
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-files');
```

## File Size Limits

The system automatically enforces these limits:

- **PDFs**: 10 MB
- **Images** (JPG, PNG, etc.): 5 MB
- **Documents** (DOC, DOCX, TXT): 10 MB
- **Videos** (MP4, MOV): 50 MB
- **Other files**: 10 MB

## Usage

### For Large Files (Videos, Raw Footage):
1. Upload to your Google Drive
2. Click "Add Folder" to set the main project folder URL
3. Click "Add Drive Link" to add individual file links

### For Small Files (Documents, Images):
1. Click "Upload File" in the project detail modal
2. Select file, category, and add description
3. File is uploaded to Supabase Storage automatically

### File Categories:
- **Pre-Production**: Scripts, storyboards, shot lists
- **Production**: Raw footage, dailies, BTS
- **Post-Production**: Edit versions, graphics, music
- **Deliverables**: Final exports, client versions
- **Other**: Miscellaneous files

## Features

- ✅ Automatic file type detection
- ✅ Size limit validation before upload
- ✅ Google Drive integration for large files
- ✅ Organized by production phase
- ✅ File preview and download
- ✅ Delete protection
- ✅ Client access control (coming soon)
