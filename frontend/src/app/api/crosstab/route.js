import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), '..', 'output', 'role_experience_crosstab.csv');
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ error: 'Crosstab data file not found' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n').map(line => line.trim()).filter(Boolean);

    if (lines.length === 0) {
      return NextResponse.json({ error: 'Empty data file' }, { status: 500 });
    }

    // Header line: role_category,Entry Level,1-2 Years,3-5 Years,5+ Years,10+ Years,Experience Required (Unspecified),Not Specified
    const headers = lines[0].split(',');
    const experienceLevels = headers.slice(1);

    const rows = [];
    let maxVal = 0;

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      const role = parts[0];
      const values = parts.slice(1).map(Number);
      
      const cells = values.map((val, idx) => {
        if (val > maxVal) maxVal = val;
        return {
          experience: experienceLevels[idx],
          count: val
        };
      });

      rows.push({
        role,
        cells
      });
    }

    return NextResponse.json({
      experienceLevels,
      rows,
      maxVal
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
