import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

export interface ResumeData {
  academic: any[];
  experience: any[];
  projects: any[];
  extracurricular: any[];
  volunteering: any[];
  skills: any[];
  interests: any[];
  languages: any[];
}

export interface UserProfile {
  full_name?: string;
  email_address?: string;
  phone_number?: string;
}

/**
 * Creates a borderless table row with left and right aligned text
 * @param leftText - Text to display on the left side
 * @param rightText - Text to display on the right side
 * @param leftTextStyle - Optional styling for left text
 * @param rightTextStyle - Optional styling for right text
 */
const createAlignedRow = (
  leftText: string,
  rightText: string,
  leftTextStyle?: any,
  rightTextStyle?: any
): Table => {
  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: leftText,
                    ...leftTextStyle,
                  }),
                ],
                alignment: AlignmentType.LEFT,
              }),
            ],
            margins: {
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: rightText,
                    ...rightTextStyle,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
            margins: {
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
            },
          }),
        ],
      }),
    ],
  });
};

/**
 * Generates a DOCX document from resume data
 * @param resumeData - The structured resume data
 * @param userProfile - User profile information
 * @param filename - Optional custom filename
 */
export const generateDocxFromResumeData = async (
  resumeData: ResumeData,
  userProfile: UserProfile,
  filename?: string
): Promise<void> => {
  try {
    // Create the document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header section with name and contact info
          ...generateHeaderSection(userProfile),
          
          // Main content sections
          ...generateAcademicSection(resumeData.academic),
          ...generateExperienceSection(resumeData.experience),
          ...generateProjectsSection(resumeData.projects),
          ...generateExtracurricularSection(resumeData.extracurricular),
          ...generateVolunteeringSection(resumeData.volunteering),
          ...generateSkillsAndInterestsSection(resumeData.skills, resumeData.interests, resumeData.languages),
        ],
      }],
    });

    // Generate the DOCX file
    const blob = await Packer.toBlob(doc);

    // Generate filename
    const userName = userProfile?.full_name || 'Resume';
    const sanitizedUserName = userName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const finalFilename = filename || `${sanitizedUserName}_Resume.docx`;

    // Download the file
    saveAs(blob, finalFilename);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    throw new Error('Failed to generate DOCX document');
  }
};

/**
 * Generates the header section with name and contact information
 */
const generateHeaderSection = (userProfile: UserProfile): Paragraph[] => {
  const userName = userProfile?.full_name || 'Resume';
  const contactInfo = [
    userProfile?.phone_number,
    userProfile?.email_address
  ].filter(Boolean);

  const paragraphs: Paragraph[] = [
    // Name as main heading
    new Paragraph({
      children: [
        new TextRun({
          text: userName,
          bold: true,
          size: 32, // 16pt font size
          color: "000000", // Black color
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 200, // 10pt spacing
      },
    }),
  ];

  // Add contact info if available
  if (contactInfo.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactInfo.join(' | '),
            size: 22, // 11pt font size
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 400, // 20pt spacing
        },
      })
    );
  }

  return paragraphs;
};

/**
 * Generates the academic/education section
 */
const generateAcademicSection = (academic: any[]): Paragraph[] => {
  if (!academic || academic.length === 0) return [];

  const paragraphs: Paragraph[] = [
    // Section title
    new Paragraph({
      children: [
        new TextRun({
          text: 'EDUCATION',
          bold: true,
          size: 24, // 12pt font size
          color: "000000", // Black color
        }),
      ],
      heading: HeadingLevel.HEADING_2,
      border: {
        bottom: {
          color: "000000",      // Black color
          space: 1,             // The distance of the border from the text
          style: BorderStyle.SINGLE, // A single solid line
          size: 6,              // Size in eighths of a point (6 = 0.75pt)
        },
      },
      spacing: {
        before: 200, // 10pt spacing before
        after: 200, // 10pt spacing after
      },
    }),
  ];

  // Add each academic entry
  academic.forEach((item) => {
    if (item.title) {
      // Institution name
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: item.title,
              bold: true,
              size: 22, // 11pt font size
              color: "000000", // Black color
            }),
          ],
          spacing: {
            after: 100, // 5pt spacing
          },
        })
      );
    }

    if (item.position) {
      // Position (left-aligned) and date (right-aligned) on same line
      const dateRange = formatDateRange(item.fromDate, item.toDate, item.isCurrent);
      
      paragraphs.push(
        createAlignedRow(
          item.position,
          dateRange || '',
          { italics: true, size: 22 }, // Left text style
          { italics: true, size: 22 }  // Right text style
        )
      );
      
      // Add spacing after
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: '' })],
          spacing: {
            after: 100, // 5pt spacing
          },
        })
      );
    }

    // Add bullets if available
    if (item.bullets && item.bullets.length > 0) {
      item.bullets.forEach((bullet: string) => {
        paragraphs.push(
          new Paragraph({
            text: bullet,
            bullet: {
              level: 0,
            },
            spacing: {
              after: 50, // 2.5pt spacing
            },
          })
        );
      });
    }

    // Add spacing after each entry
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: '' })],
        spacing: {
          after: 100, // 5pt spacing
        },
      })
    );
  });

  return paragraphs;
};

/**
 * Generates the experience section
 */
const generateExperienceSection = (experience: any[]): Paragraph[] => {
  if (!experience || experience.length === 0) return [];

  const paragraphs: Paragraph[] = [
    // Section title
    new Paragraph({
      children: [
        new TextRun({
          text: 'EXPERIENCE',
          bold: true,
          size: 24, // 12pt font size
          color: "000000", // Black color
        }),
      ],
      heading: HeadingLevel.HEADING_2,
      border: {
        bottom: {
          color: "000000",      // Black color
          space: 1,             // The distance of the border from the text
          style: BorderStyle.SINGLE, // A single solid line
          size: 6,              // Size in eighths of a point (6 = 0.75pt)
        },
      },
      spacing: {
        before: 200, // 10pt spacing before
        after: 200, // 10pt spacing after
      },
    }),
  ];

  // Add each experience entry
  experience.forEach((item) => {
    if (item.title) {
      // Company/Organization name
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: item.title,
              bold: true,
              size: 22, // 11pt font size
              color: "000000", // Black color
            }),
          ],
          spacing: {
            after: 100, // 5pt spacing
          },
        })
      );
    }

    if (item.position) {
      // Position (left-aligned) and date (right-aligned) on same line
      const dateRange = formatDateRange(item.fromDate, item.toDate, item.isCurrent);
      
      paragraphs.push(
        createAlignedRow(
          item.position,
          dateRange || '',
          { italics: true, size: 22 }, // Left text style
          { italics: true, size: 22 }  // Right text style
        )
      );
      
      // Add spacing after
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: '' })],
          spacing: {
            after: 100, // 5pt spacing
          },
        })
      );
    }

    // Add bullets if available
    if (item.bullets && item.bullets.length > 0) {
      item.bullets.forEach((bullet: string) => {
        paragraphs.push(
          new Paragraph({
            text: bullet,
            bullet: {
              level: 0,
            },
            spacing: {
              after: 50, // 2.5pt spacing
            },
          })
        );
      });
    }

    // Add spacing after each entry
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: '' })],
        spacing: {
          after: 100, // 5pt spacing
        },
      })
    );
  });

  return paragraphs;
};

/**
 * Generates the projects section
 */
const generateProjectsSection = (projects: any[]): Paragraph[] => {
  if (!projects || projects.length === 0) return [];

  const paragraphs: Paragraph[] = [
    // Section title
    new Paragraph({
      children: [
        new TextRun({
          text: 'PROJECTS',
          bold: true,
          size: 24, // 12pt font size
          color: "000000", // Black color
        }),
      ],
      heading: HeadingLevel.HEADING_2,
      border: {
        bottom: {
          color: "000000",      // Black color
          space: 1,             // The distance of the border from the text
          style: BorderStyle.SINGLE, // A single solid line
          size: 6,              // Size in eighths of a point (6 = 0.75pt)
        },
      },
      spacing: {
        before: 200, // 10pt spacing before
        after: 200, // 10pt spacing after
      },
    }),
  ];

  // Add each project entry
  projects.forEach((item) => {
    if (item.title) {
      // Project name
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: item.title,
              bold: true,
              size: 22, // 11pt font size
              color: "000000", // Black color
            }),
          ],
          spacing: {
            after: 100, // 5pt spacing
          },
        })
      );
    }

    if (item.position) {
      // Position (left-aligned) and date (right-aligned) on same line
      const dateRange = formatDateRange(item.fromDate, item.toDate, item.isCurrent);
      
      paragraphs.push(
        createAlignedRow(
          item.position,
          dateRange || '',
          { italics: true, size: 22 }, // Left text style
          { italics: true, size: 22 }  // Right text style
        )
      );
      
      // Add spacing after
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: '' })],
          spacing: {
            after: 100, // 5pt spacing
          },
        })
      );
    }

    // Add bullets if available
    if (item.bullets && item.bullets.length > 0) {
      item.bullets.forEach((bullet: string) => {
        paragraphs.push(
          new Paragraph({
            text: bullet,
            bullet: {
              level: 0,
            },
            spacing: {
              after: 50, // 2.5pt spacing
            },
          })
        );
      });
    }

    // Add spacing after each entry
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: '' })],
        spacing: {
          after: 100, // 5pt spacing
        },
      })
    );
  });

  return paragraphs;
};

/**
 * Generates the extracurricular activities section
 */
const generateExtracurricularSection = (extracurricular: any[]): Paragraph[] => {
  if (!extracurricular || extracurricular.length === 0) return [];

  const paragraphs: Paragraph[] = [
    // Section title
    new Paragraph({
      children: [
        new TextRun({
          text: 'EXTRACURRICULARS',
          bold: true,
          size: 24, // 12pt font size
          color: "000000", // Black color
        }),
      ],
      heading: HeadingLevel.HEADING_2,
      border: {
        bottom: {
          color: "000000",      // Black color
          space: 1,             // The distance of the border from the text
          style: BorderStyle.SINGLE, // A single solid line
          size: 6,              // Size in eighths of a point (6 = 0.75pt)
        },
      },
      spacing: {
        before: 200, // 10pt spacing before
        after: 200, // 10pt spacing after
      },
    }),
  ];

  // Add each extracurricular entry
  extracurricular.forEach((item) => {
    if (item.title) {
      // Activity name
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: item.title,
              bold: true,
              size: 22, // 11pt font size
              color: "000000", // Black color
            }),
          ],
          spacing: {
            after: 100, // 5pt spacing
          },
        })
      );
    }

    if (item.position) {
      // Position (left-aligned) and date (right-aligned) on same line
      const dateRange = formatDateRange(item.fromDate, item.toDate, item.isCurrent);
      
      paragraphs.push(
        createAlignedRow(
          item.position,
          dateRange || '',
          { italics: true, size: 22 }, // Left text style
          { italics: true, size: 22 }  // Right text style
        )
      );
      
      // Add spacing after
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: '' })],
          spacing: {
            after: 100, // 5pt spacing
          },
        })
      );
    }

    // Add bullets if available
    if (item.bullets && item.bullets.length > 0) {
      item.bullets.forEach((bullet: string) => {
        paragraphs.push(
          new Paragraph({
            text: bullet,
            bullet: {
              level: 0,
            },
            spacing: {
              after: 50, // 2.5pt spacing
            },
          })
        );
      });
    }

    // Add spacing after each entry
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: '' })],
        spacing: {
          after: 100, // 5pt spacing
        },
      })
    );
  });

  return paragraphs;
};

/**
 * Generates the volunteering section
 */
const generateVolunteeringSection = (volunteering: any[]): Paragraph[] => {
  if (!volunteering || volunteering.length === 0) return [];

  const paragraphs: Paragraph[] = [
    // Section title
    new Paragraph({
      children: [
        new TextRun({
          text: 'VOLUNTEERING',
          bold: true,
          size: 24, // 12pt font size
          color: "000000", // Black color
        }),
      ],
      heading: HeadingLevel.HEADING_2,
      border: {
        bottom: {
          color: "000000",      // Black color
          space: 1,             // The distance of the border from the text
          style: BorderStyle.SINGLE, // A single solid line
          size: 6,              // Size in eighths of a point (6 = 0.75pt)
        },
      },
      spacing: {
        before: 200, // 10pt spacing before
        after: 200, // 10pt spacing after
      },
    }),
  ];

  // Add each volunteering entry
  volunteering.forEach((item) => {
    if (item.title) {
      // Organization name
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: item.title,
              bold: true,
              size: 22, // 11pt font size
              color: "000000", // Black color
            }),
          ],
          spacing: {
            after: 100, // 5pt spacing
          },
        })
      );
    }

    if (item.position) {
      // Position (left-aligned) and date (right-aligned) on same line
      const dateRange = formatDateRange(item.fromDate, item.toDate, item.isCurrent);
      
      paragraphs.push(
        createAlignedRow(
          item.position,
          dateRange || '',
          { italics: true, size: 22 }, // Left text style
          { italics: true, size: 22 }  // Right text style
        )
      );
      
      // Add spacing after
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: '' })],
          spacing: {
            after: 100, // 5pt spacing
          },
        })
      );
    }

    // Add bullets if available
    if (item.bullets && item.bullets.length > 0) {
      item.bullets.forEach((bullet: string) => {
        paragraphs.push(
          new Paragraph({
            text: bullet,
            bullet: {
              level: 0,
            },
            spacing: {
              after: 50, // 2.5pt spacing
            },
          })
        );
      });
    }

    // Add spacing after each entry
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: '' })],
        spacing: {
          after: 100, // 5pt spacing
        },
      })
    );
  });

  return paragraphs;
};

/**
 * Generates the combined skills and interests section
 */
const generateSkillsAndInterestsSection = (
  skills: any[],
  interests: any[],
  languages: any[]
): Paragraph[] => {
  const hasSkills = skills && skills.length > 0;
  const hasInterests = interests && interests.length > 0;
  const hasLanguages = languages && languages.length > 0;

  if (!hasSkills && !hasInterests && !hasLanguages) return [];

  const paragraphs: Paragraph[] = [
    // Section title
    new Paragraph({
      children: [
        new TextRun({
          text: 'SKILLS AND INTERESTS',
          bold: true,
          size: 24, // 12pt font size
          color: "000000", // Black color
        }),
      ],
      heading: HeadingLevel.HEADING_2,
      border: {
        bottom: {
          color: "000000",      // Black color
          space: 1,             // The distance of the border from the text
          style: BorderStyle.SINGLE, // A single solid line
          size: 6,              // Size in eighths of a point (6 = 0.75pt)
        },
      },
      spacing: {
        before: 200, // 10pt spacing before
        after: 200, // 10pt spacing after
      },
    }),
  ];

  // Add skills
  if (hasSkills) {
    const skillsText = skills.map((item) => 
      item.bullets && item.bullets.length > 0 ? item.bullets.join(', ') : (item.title || '')
    ).join(', ');

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Skills: ${skillsText}`,
            size: 22, // 11pt font size
          }),
        ],
        spacing: {
          after: 100, // 5pt spacing
        },
      })
    );
  }

  // Add languages
  if (hasLanguages) {
    const languagesText = languages.map((item) => {
      if (item.title) {
        return item.title;
      } else if (item.language) {
        return item.proficiency ? `${item.language} (${item.proficiency})` : item.language;
      } else if (typeof item === 'string') {
        return item;
      } else if (item.bullets && item.bullets.length > 0) {
        return item.bullets.join(', ');
      }
      return '';
    }).filter(Boolean).join(', ');

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Languages: ${languagesText}`,
            size: 22, // 11pt font size
          }),
        ],
        spacing: {
          after: 100, // 5pt spacing
        },
      })
    );
  }

  // Add interests
  if (hasInterests) {
    const interestsText = interests.map((item) => item.title || '').join(', ');

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Interests: ${interestsText}`,
            size: 22, // 11pt font size
          }),
        ],
        spacing: {
          after: 100, // 5pt spacing
        },
      })
    );
  }

  return paragraphs;
};

/**
 * Formats date range for display
 */
const formatDateRange = (fromDate: string, toDate: string, isCurrent: boolean): string => {
  if (!fromDate && !toDate) return '';
  const from = fromDate || '';
  const to = isCurrent ? 'Present' : (toDate || '');
  return from && to ? `${from} – ${to}` : (from || to);
};
