# GitHub Copilot AIC Usage Analyzer

A single-page application that visualizes GitHub Copilot AI Credits (AIC) usage data from CSV exports. This tool helps you understand your team's Copilot usage patterns.

## Quick Start

Need to analyze the AI Credits (AIC) usage CSV? 
I created a SPA with Spark and Coding Agent to display an overview of the AIC Usage CSV that you can currently download (no API yet 😓), so share it where needed! 
 
Hosted on GitHub Pages: [GitHub Copilot AIC Usage Analyzer](https://xebia.github.io/github-copilot-premium-reqs-usage/)

Upload the CSV from the enterprise export (Billing and Licenses → Usage → Export dropdown right top)
 
Result: 

![Image](https://github.com/user-attachments/assets/b4492fef-aff9-464e-8ac8-6830475d00ef)  

![Image](https://github.com/user-attachments/assets/b2d896f5-269a-4b33-9bb9-7e28354fdc5e)  

![Image](https://github.com/user-attachments/assets/f8fb7acd-a369-492e-a93a-158fbb1bd0a7)

## Features

- Upload and parse GitHub Copilot usage CSV data
- Visualize usage over time with interactive charts
- See request distribution by model
- Track compliant vs. exceeding quota requests
- Analyze usage patterns with daily breakdown charts
- Compare a saved user cohort with the overall population and exclude accounts from all views

### Enterprise profiles and user lists

After uploading one or more usage exports, explicitly choose or create an enterprise profile. Usage exports do **not** reliably identify their enterprise: the `organization` column, file names, and usernames are not used to guess one. Each new upload starts without a selected profile; choose the correct one again to restore its lists. Do not combine exports from different enterprises in one upload.

The **cohort** selects accounts to show in the dashboard; with no cohort selected, the dashboard shows the overall population. The **exclusion** list removes accounts from the overall population, cohort, user search, charts, and dialogs, even if they also appear in the cohort. A single-user search temporarily overrides the cohort view but never overrides exclusions. Comparison totals always use the selected month: overall is all loaded users minus exclusions, and cohort is selected users minus exclusions. Request totals and user counts are shown for both; AI credits are also compared when all included records contain the AIC quantity field. The plan selector updates plan-dependent dashboard calculations.

Add or remove usernames in either searchable list, or import/export a separate CSV for each list. A list CSV contains one `username` column (header required), one username per row; quoted values and duplicate names are supported. Import **replaces** only that list. Usernames absent from the current export stay saved and are marked as such until another export includes them. Profile names and username lists remain in browser localStorage, separated by enterprise; usage rows are never persisted. Clearing browser site data removes saved profiles and lists. If stored data is damaged, an error and explicit reset action are shown rather than applying it silently.

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/[your-username]/github-copilot-usage.git
   cd github-copilot-usage
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5000 in your browser


## CSV Format

The application accepts either of the following CSV export formats from GitHub Copilot AI Credits (AIC) usage:

**Original format (until October):**
```
"Timestamp","User","Model","Requests Used","Exceeds Monthly Quota","Total Monthly Quota"
"2025-06-11T05:13:27.8766440Z","UserName","gpt-4.1-2025-04-14","1","False","Unlimited"
```

**New format (starting from October):**
```
"date","username","model","quantity","exceeds_quota","total_monthly_quota"
"2025-06-11","UserName","GPT-5","1","False","300"
```

> Column order does not matter and extra columns are ignored. Both formats are supported for backward compatibility.

## Deployment

### GitHub Pages

This project is configured for easy deployment to GitHub Pages. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

Quick deploy:
```bash
npm run deploy
```

## Built With

- React
- TypeScript
- Vite
- Recharts
- shadcn/ui components
- Tailwind CSS

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- GitHub Copilot for helping with development
- The shadcn/ui team for the beautiful components
- Recharts for the charting library