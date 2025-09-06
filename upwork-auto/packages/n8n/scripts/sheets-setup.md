# Google Sheets Setup Guide

This guide provides step-by-step instructions for setting up Google Sheets integration with the Upwork automation workflow.

## [MANUAL] Step 1: Create Google Cloud Project

### 1.1 Create New Project
1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Click "Select a project"** → **"New Project"**
3. **Enter project details**:
   - Project name: `upwork-automation`
   - Organization: (select if applicable)
4. **Click "Create"**

### 1.2 Enable Google Sheets API
1. **In the Google Cloud Console**, go to **"APIs & Services"** → **"Library"**
2. **Search for "Google Sheets API"**
3. **Click on "Google Sheets API"**
4. **Click "Enable"**

## [MANUAL] Step 2: Create Service Account

### 2.1 Create Service Account
1. **Go to "APIs & Services"** → **"Credentials"**
2. **Click "Create Credentials"** → **"Service Account"**
3. **Fill in service account details**:
   - Service account name: `upwork-automation-sa`
   - Service account ID: `upwork-automation-sa` (auto-generated)
   - Description: `Service account for Upwork automation workflow`
4. **Click "Create and Continue"**

### 2.2 Grant Roles (Optional)
1. **In the "Grant this service account access to project" section**:
   - Role: `Editor` (or minimal required permissions)
2. **Click "Continue"**
3. **Click "Done"**

### 2.3 Generate JSON Key
1. **In the Credentials page**, find your service account
2. **Click on the service account email**
3. **Go to "Keys" tab**
4. **Click "Add Key"** → **"Create new key"**
5. **Select "JSON" format**
6. **Click "Create"**
7. **Download the JSON file** and save it securely

## [MANUAL] Step 3: Create Google Sheets Spreadsheet

### 3.1 Create New Spreadsheet
1. **Go to [Google Sheets](https://sheets.google.com/)**
2. **Click "Blank"** to create a new spreadsheet
3. **Rename the spreadsheet** to `Upwork Automation Log`

### 3.2 Set Up Sheet Structure
1. **Rename the first sheet** to `upwork_automation_log`
2. **Add headers in row 1**:

| A | B | C | D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| timestamp | jobUrl | title | score | reasons | proposal | budget | proposals_band | payment_verified | client_spend | country | status | submitted_at |

### 3.3 Format Headers
1. **Select row 1** (headers)
2. **Make text bold** (Ctrl+B)
3. **Set background color** to light gray
4. **Freeze the header row**:
   - Go to **View** → **Freeze** → **1 row**

### 3.4 Get Spreadsheet ID
1. **Copy the spreadsheet URL** from the address bar
2. **Extract the Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit#gid=0
   ```
3. **Save the Spreadsheet ID** - you'll need it for the environment variable

## [MANUAL] Step 4: Share Spreadsheet with Service Account

### 4.1 Share with Service Account
1. **In your Google Sheets**, click **"Share"** button
2. **Add the service account email**:
   - Email: `upwork-automation-sa@your-project-id.iam.gserviceaccount.com`
   - (Replace `your-project-id` with your actual project ID)
3. **Set permissions** to **"Editor"**
4. **Uncheck "Notify people"** (optional)
5. **Click "Send"**

### 4.2 Verify Sharing
1. **Check that the service account appears** in the sharing list
2. **Ensure it has "Editor" permissions**

## [MANUAL] Step 5: Configure n8n Credentials

### 5.1 Add Google Sheets Credential in n8n
1. **Open n8n interface** (http://localhost:5678)
2. **Go to Settings** → **Credentials**
3. **Click "Add Credential"**
4. **Search for "Google Sheets"**
5. **Select "Google Sheets OAuth2 API"** or **"Google Sheets Service Account"**

### 5.2 Configure Service Account Credential
1. **Choose "Service Account" authentication**
2. **Upload the JSON key file** you downloaded earlier
3. **Test the connection**
4. **Save the credential**

### 5.3 Alternative: OAuth2 Setup (if preferred)
1. **Choose "OAuth2 API" authentication**
2. **Follow OAuth2 flow**:
   - Create OAuth2 credentials in Google Cloud Console
   - Configure redirect URIs
   - Complete OAuth2 authorization

## [MANUAL] Step 6: Update Environment Variables

### 6.1 Set SHEETS_ID Environment Variable
1. **In your `.env` file**, add:
   ```bash
   SHEETS_ID=your_spreadsheet_id_here
   ```
2. **Replace `your_spreadsheet_id_here`** with the actual Spreadsheet ID

### 6.2 Set Storage Target
1. **In your `.env` file**, set:
   ```bash
   STORAGE_TARGET=sheets
   ```

## [MANUAL] Step 7: Test the Setup

### 7.1 Test Google Sheets Connection
1. **In n8n**, create a simple test workflow
2. **Add a Google Sheets node**
3. **Configure it to read from your spreadsheet**
4. **Run the workflow** to test the connection

### 7.2 Test Data Writing
1. **Create a test workflow** that writes data to Google Sheets
2. **Use the "Append" operation**
3. **Add a test row** with sample data
4. **Verify the data appears** in your spreadsheet

## Troubleshooting

### Common Issues

#### 1. "Permission denied" errors
- **Check service account email** is correct
- **Verify spreadsheet is shared** with service account
- **Ensure service account has Editor permissions**

#### 2. "API not enabled" errors
- **Verify Google Sheets API** is enabled in Google Cloud Console
- **Check project selection** in Google Cloud Console

#### 3. "Invalid credentials" errors
- **Verify JSON key file** is correct and not corrupted
- **Check service account** exists and is active
- **Ensure JSON key** has not expired

#### 4. "Spreadsheet not found" errors
- **Verify Spreadsheet ID** is correct
- **Check spreadsheet URL** format
- **Ensure spreadsheet exists** and is accessible

### Debug Steps

#### 1. Verify Service Account
```bash
# Check service account exists
gcloud iam service-accounts list --project=your-project-id

# Check service account permissions
gcloud projects get-iam-policy your-project-id
```

#### 2. Test API Access
```bash
# Test Google Sheets API access
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://sheets.googleapis.com/v4/spreadsheets/your-spreadsheet-id"
```

#### 3. Check Spreadsheet Sharing
1. **Open spreadsheet** in Google Sheets
2. **Click "Share"** button
3. **Verify service account** is listed with correct permissions

## Security Best Practices

### 1. Service Account Security
- **Use minimal permissions** (only what's needed)
- **Rotate service account keys** regularly
- **Store JSON keys securely** (not in version control)

### 2. Spreadsheet Security
- **Limit sharing** to necessary accounts only
- **Use specific permissions** (Editor vs Viewer)
- **Monitor access logs** in Google Cloud Console

### 3. API Security
- **Enable API restrictions** in Google Cloud Console
- **Use API keys** with appropriate restrictions
- **Monitor API usage** and quotas

## Maintenance

### 1. Regular Tasks
- **Monitor API quotas** and usage
- **Check spreadsheet permissions** periodically
- **Review service account access** quarterly

### 2. Backup Strategy
- **Export spreadsheet** to CSV regularly
- **Keep service account keys** in secure backup
- **Document configuration** for disaster recovery

### 3. Updates
- **Update service account keys** annually
- **Review and update permissions** as needed
- **Monitor Google API changes** and updates

## Environment Variables Summary

After completing the setup, ensure these environment variables are configured:

```bash
# Google Sheets Configuration
SHEETS_ID=your_spreadsheet_id_here
STORAGE_TARGET=sheets

# Service Account JSON (if using file-based auth)
GOOGLE_SHEETS_CREDENTIALS_PATH=./credentials/google-sheets.json
```

## Next Steps

1. **Test the complete workflow** with sample data
2. **Monitor the first few runs** for any issues
3. **Set up monitoring and alerting** for the automation
4. **Document any customizations** or modifications made
