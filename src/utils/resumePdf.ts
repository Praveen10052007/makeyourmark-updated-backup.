import { jsPDF } from 'jspdf';
import { ResumeData } from '../types';
import { ResumeTemplateType } from '../components/views/ResumeBuilderView';

export interface GeneratedPdfResult {
  blob: Blob;
  filename: string;
  byteLength: number;
  sizeLabel: string;
}

interface TemplatePalette {
  headingFont: 'times' | 'helvetica' | 'courier';
  bodyFont: 'times' | 'helvetica' | 'courier';
  accentRgb: [number, number, number];
  darkRgb: [number, number, number];
  mutedRgb: [number, number, number];
  bannerHeader: boolean;
  centeredHeader: boolean;
  leftAccentBar: boolean;
  heavyRule: boolean;
  fresherOrder: boolean;
}

const TEMPLATE_STYLES: Record<ResumeTemplateType, TemplatePalette> = {
  'ats-classic': {
    headingFont: 'times',
    bodyFont: 'helvetica',
    accentRgb: [15, 23, 42],
    darkRgb: [15, 23, 42],
    mutedRgb: [71, 85, 105],
    bannerHeader: false,
    centeredHeader: true,
    leftAccentBar: false,
    heavyRule: true,
    fresherOrder: false,
  },
  'modern-pro': {
    headingFont: 'helvetica',
    bodyFont: 'helvetica',
    accentRgb: [234, 88, 12],
    darkRgb: [24, 24, 27],
    mutedRgb: [82, 82, 91],
    bannerHeader: false,
    centeredHeader: false,
    leftAccentBar: true,
    heavyRule: false,
    fresherOrder: false,
  },
  'modern-fresher': {
    headingFont: 'helvetica',
    bodyFont: 'helvetica',
    accentRgb: [234, 88, 12],
    darkRgb: [15, 23, 42],
    mutedRgb: [71, 85, 105],
    bannerHeader: true,
    centeredHeader: false,
    leftAccentBar: false,
    heavyRule: false,
    fresherOrder: true,
  },
  'software-engineer': {
    headingFont: 'courier',
    bodyFont: 'helvetica',
    accentRgb: [234, 88, 12],
    darkRgb: [15, 23, 42],
    mutedRgb: [71, 85, 105],
    bannerHeader: false,
    centeredHeader: false,
    leftAccentBar: false,
    heavyRule: true,
    fresherOrder: false,
  },
  'college-intern': {
    headingFont: 'helvetica',
    bodyFont: 'helvetica',
    accentRgb: [180, 83, 9],
    darkRgb: [15, 23, 42],
    mutedRgb: [71, 85, 105],
    bannerHeader: false,
    centeredHeader: true,
    leftAccentBar: false,
    heavyRule: false,
    fresherOrder: true,
  },
  'experienced-pro': {
    headingFont: 'helvetica',
    bodyFont: 'helvetica',
    accentRgb: [30, 41, 59],
    darkRgb: [15, 23, 42],
    mutedRgb: [71, 85, 105],
    bannerHeader: false,
    centeredHeader: false,
    leftAccentBar: false,
    heavyRule: true,
    fresherOrder: false,
  },
};

function sanitizePdfText(value?: string): string {
  if (!value) return '';
  return String(value)
    .replace(/\r\n/g, '\n')
    .replace(/[•●◦▪]/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function buildSafeFilename(fullName: string, targetRole: string, template: ResumeTemplateType): string {
  const cleanPart = (s: string, fallback: string) =>
    (s || fallback)
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 32) || fallback;
  return `${cleanPart(fullName, 'Candidate')}_${cleanPart(targetRole, 'Resume')}_${template}.pdf`;
}

export function buildResumePdf(
  resume: ResumeData,
  template: ResumeTemplateType,
  targetRole: string
): GeneratedPdfResult {
  const palette = TEMPLATE_STYLES[template] || TEMPLATE_STYLES['ats-classic'];
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimit = pageHeight - 14;
  let y = 16;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > bottomLimit) {
      doc.addPage();
      y = 16;
    }
  };

  const drawWrappedText = (
    text: string,
    x: number,
    maxWidth: number,
    fontSize: number,
    lineHeight: number,
    fontName: 'times' | 'helvetica' | 'courier' = palette.bodyFont,
    fontStyle: 'normal' | 'bold' | 'italic' = 'normal',
    color: [number, number, number] = palette.darkRgb,
    align: 'left' | 'center' = 'left'
  ) => {
    const clean = sanitizePdfText(text);
    if (!clean) return;
    doc.setFont(fontName, fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines: string[] = doc.splitTextToSize(clean, maxWidth);
    for (const line of lines) {
      ensureSpace(lineHeight + 1);
      doc.text(line, x, y, { align });
      y += lineHeight;
    }
  };

  const drawSectionHeading = (title: string) => {
    ensureSpace(11);
    y += 2;
    doc.setFont(palette.headingFont, 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(palette.accentRgb[0], palette.accentRgb[1], palette.accentRgb[2]);
    doc.text(sanitizePdfText(title).toUpperCase(), marginX, y);
    y += 1.8;
    doc.setDrawColor(palette.accentRgb[0], palette.accentRgb[1], palette.accentRgb[2]);
    doc.setLineWidth(palette.heavyRule ? 0.45 : 0.25);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 4.2;
  };

  const fullName = sanitizePdfText(resume.personalInfo.fullName || 'Candidate Name');
  const roleLabel = sanitizePdfText(targetRole || 'Target Role');
  const contactItems = [
    resume.personalInfo.email,
    resume.personalInfo.phone,
    resume.personalInfo.location,
    resume.personalInfo.linkedinUrl,
    resume.personalInfo.githubUrl || resume.personalInfo.portfolioUrl,
  ]
    .map((item) => sanitizePdfText(item))
    .filter(Boolean);
  const contactLine = contactItems.join('  |  ');

  // Header
  if (palette.bannerHeader) {
    doc.setFillColor(palette.accentRgb[0], palette.accentRgb[1], palette.accentRgb[2]);
    doc.rect(0, 0, pageWidth, 34, 'F');
    doc.setFont(palette.headingFont, 'bold');
    doc.setFontSize(19);
    doc.setTextColor(255, 255, 255);
    doc.text(fullName.toUpperCase(), marginX, 14);

    doc.setFont(palette.bodyFont, 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(255, 237, 213);
    doc.text(roleLabel, marginX, 20.5);

    if (contactLine) {
      doc.setFont(palette.bodyFont, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      const headerLines: string[] = doc.splitTextToSize(contactLine, contentWidth);
      doc.text(headerLines.slice(0, 2), marginX, 26.5);
    }
    y = 42;
  } else if (palette.centeredHeader) {
    drawWrappedText(fullName.toUpperCase(), pageWidth / 2, contentWidth, 18, 6.5, palette.headingFont, 'bold', palette.darkRgb, 'center');
    drawWrappedText(roleLabel, pageWidth / 2, contentWidth, 10.5, 4.8, palette.bodyFont, 'italic', palette.accentRgb, 'center');
    if (contactLine) {
      drawWrappedText(contactLine, pageWidth / 2, contentWidth, 8.5, 4.2, palette.bodyFont, 'normal', palette.mutedRgb, 'center');
    }
    y += 1.5;
    doc.setDrawColor(palette.accentRgb[0], palette.accentRgb[1], palette.accentRgb[2]);
    doc.setLineWidth(0.6);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 5;
  } else {
    const startY = y;
    if (palette.leftAccentBar) {
      doc.setFillColor(palette.accentRgb[0], palette.accentRgb[1], palette.accentRgb[2]);
      doc.rect(marginX, startY - 4.5, 1.8, 18, 'F');
    }
    const textX = palette.leftAccentBar ? marginX + 5 : marginX;
    const textW = palette.leftAccentBar ? contentWidth - 5 : contentWidth;
    drawWrappedText(
      template === 'experienced-pro' ? fullName.toUpperCase() : fullName,
      textX,
      textW,
      18,
      6.5,
      palette.headingFont,
      'bold',
      palette.darkRgb
    );
    drawWrappedText(
      template === 'software-engineer' ? `> ${roleLabel}` : roleLabel,
      textX,
      textW,
      10.5,
      4.6,
      palette.headingFont,
      'bold',
      palette.accentRgb
    );
    if (contactLine) {
      drawWrappedText(contactLine, textX, textW, 8.5, 4.2, palette.bodyFont, 'normal', palette.mutedRgb);
    }
    y += 1.5;
    doc.setDrawColor(palette.darkRgb[0], palette.darkRgb[1], palette.darkRgb[2]);
    doc.setLineWidth(palette.heavyRule ? 0.65 : 0.3);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 5;
  }

  // Section renderers
  const renderSummary = () => {
    if (!resume.summary?.trim()) return;
    drawSectionHeading(template === 'experienced-pro' ? 'Executive Summary' : 'Professional Summary');
    drawWrappedText(resume.summary, marginX, contentWidth, 9.5, 4.5, palette.bodyFont, 'normal', palette.darkRgb);
    y += 1.5;
  };

  const renderSkills = () => {
    if (!resume.skills?.length) return;
    drawSectionHeading(template === 'software-engineer' ? 'Technical Stack Matrix' : 'Skills');
    for (const s of resume.skills) {
      if (!s.category && !s.items) continue;
      const line = `${sanitizePdfText(s.category)}: ${sanitizePdfText(s.items)}`;
      ensureSpace(5);
      drawWrappedText(line, marginX, contentWidth, 9.2, 4.3, palette.bodyFont, 'normal', palette.darkRgb);
    }
    y += 1.5;
  };

  const renderExperience = () => {
    if (!resume.experience?.length) return;
    drawSectionHeading(template === 'college-intern' ? 'Internships & Campus Leadership' : 'Experience');
    for (const exp of resume.experience) {
      ensureSpace(12);
      const dateStr = sanitizePdfText(`${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`);
      const headerLeft = sanitizePdfText(`${exp.title} | ${exp.company}${exp.location ? `, ${exp.location}` : ''}`);
      doc.setFont(palette.bodyFont, 'bold');
      doc.setFontSize(10);
      doc.setTextColor(palette.darkRgb[0], palette.darkRgb[1], palette.darkRgb[2]);
      const titleLines: string[] = doc.splitTextToSize(headerLeft, contentWidth - 36);
      doc.text(titleLines[0] || headerLeft, marginX, y);
      if (dateStr) {
        doc.setFont(palette.bodyFont, 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(palette.mutedRgb[0], palette.mutedRgb[1], palette.mutedRgb[2]);
        doc.text(dateStr, pageWidth - marginX, y, { align: 'right' });
      }
      y += 4.5;
      if (titleLines.length > 1) {
        for (let i = 1; i < titleLines.length; i++) {
          ensureSpace(4.5);
          doc.setFont(palette.bodyFont, 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(palette.darkRgb[0], palette.darkRgb[1], palette.darkRgb[2]);
          doc.text(titleLines[i], marginX, y);
          y += 4.2;
        }
      }

      for (const bullet of exp.bullets || []) {
        if (!bullet?.trim()) continue;
        drawWrappedText(`-  ${bullet}`, marginX + 3, contentWidth - 3, 9.2, 4.2, palette.bodyFont, 'normal', palette.darkRgb);
      }
      y += 2;
    }
  };

  const renderProjects = () => {
    if (!resume.projects?.length) return;
    drawSectionHeading('Projects');
    for (const proj of resume.projects) {
      ensureSpace(10);
      doc.setFont(palette.bodyFont, 'bold');
      doc.setFontSize(9.8);
      doc.setTextColor(palette.darkRgb[0], palette.darkRgb[1], palette.darkRgb[2]);
      const tech = sanitizePdfText(proj.technologies);
      const nameText = sanitizePdfText(proj.name);
      doc.text(nameText, marginX, y);
      if (tech) {
        doc.setFont(palette.bodyFont, 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(palette.accentRgb[0], palette.accentRgb[1], palette.accentRgb[2]);
        const techShort = tech.length > 48 ? `${tech.slice(0, 45)}...` : tech;
        doc.text(techShort, pageWidth - marginX, y, { align: 'right' });
      }
      y += 4.2;
      if (proj.description) {
        drawWrappedText(proj.description, marginX + 2, contentWidth - 2, 9.1, 4.2, palette.bodyFont, 'normal', palette.darkRgb);
      }
      if (proj.link) {
        drawWrappedText(proj.link, marginX + 2, contentWidth - 2, 8.2, 3.8, palette.bodyFont, 'normal', palette.mutedRgb);
      }
      y += 1.5;
    }
  };

  const renderEducation = () => {
    if (!resume.education?.length) return;
    drawSectionHeading('Education');
    for (const edu of resume.education) {
      ensureSpace(9);
      const degree = sanitizePdfText(`${edu.degree} - ${edu.institution}`);
      const meta = sanitizePdfText(`${edu.graduationYear}${edu.gpa ? ` | ${edu.gpa}` : ''}`);
      doc.setFont(palette.bodyFont, 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(palette.darkRgb[0], palette.darkRgb[1], palette.darkRgb[2]);
      const lines: string[] = doc.splitTextToSize(degree, contentWidth - 34);
      doc.text(lines[0] || degree, marginX, y);
      if (meta) {
        doc.setFont(palette.bodyFont, 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(palette.mutedRgb[0], palette.mutedRgb[1], palette.mutedRgb[2]);
        doc.text(meta, pageWidth - marginX, y, { align: 'right' });
      }
      y += 4.3;
      for (let i = 1; i < lines.length; i++) {
        ensureSpace(4.2);
        doc.setFont(palette.bodyFont, 'normal');
        doc.setFontSize(9.2);
        doc.text(lines[i], marginX, y);
        y += 4.2;
      }
    }
    y += 1.5;
  };

  const renderExtras = () => {
    if (resume.certifications?.length) {
      drawSectionHeading('Certifications');
      for (const cert of resume.certifications) {
        drawWrappedText(
          `-  ${cert.name} - ${cert.issuer}${cert.year ? ` (${cert.year})` : ''}`,
          marginX,
          contentWidth,
          9.1,
          4.2,
          palette.bodyFont,
          'normal',
          palette.darkRgb
        );
      }
      y += 1.5;
    }

    if (resume.achievements?.length) {
      drawSectionHeading('Achievements');
      for (const ach of resume.achievements) {
        drawWrappedText(`-  ${ach}`, marginX, contentWidth, 9.1, 4.2, palette.bodyFont, 'normal', palette.darkRgb);
      }
      y += 1.5;
    }

    if (resume.languages?.length) {
      drawSectionHeading('Languages');
      drawWrappedText(
        resume.languages.join('  |  '),
        marginX,
        contentWidth,
        9.1,
        4.2,
        palette.bodyFont,
        'normal',
        palette.darkRgb
      );
    }
  };

  if (palette.fresherOrder) {
    renderSummary();
    renderEducation();
    renderSkills();
    renderProjects();
    renderExperience();
    renderExtras();
  } else if (template === 'software-engineer') {
    renderSummary();
    renderSkills();
    renderExperience();
    renderProjects();
    renderEducation();
    renderExtras();
  } else {
    renderSummary();
    renderExperience();
    renderProjects();
    renderSkills();
    renderEducation();
    renderExtras();
  }

  const arrayBuffer = doc.output('arraybuffer');
  const bytes = new Uint8Array(arrayBuffer);
  // Verify %PDF- header bytes (0x25 0x50 0x44 0x46 0x2D)
  const header = String.fromCharCode(bytes[0] || 0, bytes[1] || 0, bytes[2] || 0, bytes[3] || 0, bytes[4] || 0);
  if (header !== '%PDF-' || bytes.byteLength < 512) {
    throw new Error('Generated PDF failed integrity validation.');
  }

  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  const filename = buildSafeFilename(resume.personalInfo.fullName, targetRole, template);
  const sizeKb = Math.max(1, Math.round(bytes.byteLength / 1024));

  return {
    blob,
    filename,
    byteLength: bytes.byteLength,
    sizeLabel: `${sizeKb} KB`,
  };
}

export async function downloadResumePdf(
  resume: ResumeData,
  template: ResumeTemplateType,
  targetRole: string
): Promise<GeneratedPdfResult> {
  const result = buildResumePdf(resume, template, targetRole);
  const url = URL.createObjectURL(result.blob);

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Keep object URL alive for 15 seconds so Android download manager & mobile browsers complete the transfer cleanly
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }, 15000);

    return result;
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}
