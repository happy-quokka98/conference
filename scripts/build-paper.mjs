import fs from 'node:fs';
import path from 'node:path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun,
  PageNumber,
  Footer,
  Header,
  TableOfContents,
  PageBreak,
  ShadingType,
} from 'docx';

const outDir = path.resolve('scripts/output');
const results = JSON.parse(fs.readFileSync(path.join(outDir, 'experiment-results.json'), 'utf8'));

const FONT = 'Sylfaen';

function p(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    spacing: { after: opts.after ?? 120, line: opts.line ?? 300 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: opts.size ?? 22, // 11pt
        bold: opts.bold ?? false,
        italics: opts.italics ?? false,
        color: opts.color ?? '1E293B',
      }),
    ],
  });
}

function pRuns(runs, opts = {}) {
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    spacing: { after: opts.after ?? 120, line: opts.line ?? 300 },
    children: runs.map(
      (r) =>
        new TextRun({
          text: r.text,
          font: FONT,
          size: r.size ?? 22,
          bold: r.bold ?? false,
          italics: r.italics ?? false,
          color: r.color ?? '1E293B',
        })
    ),
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 100 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 27, // 13.5pt
        bold: true,
        color: '0F172A',
      }),
    ],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 150, after: 70 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 24, // 12pt
        bold: true,
        color: '0369A1',
      }),
    ],
  });
}

function bullet(lead, body) {
  return new Paragraph({
    bullet: { level: 0 },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 65, line: 276 },
    children: [
      new TextRun({ text: lead, font: FONT, size: 21.5, bold: true, color: '0F172A' }),
      new TextRun({ text: body, font: FONT, size: 21.5, color: '1E293B' }),
    ],
  });
}

function imageBlock(filename, caption, widthPx = 450, heightPx = 235) {
  const imgBuf = fs.readFileSync(path.join(outDir, filename));
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 40 },
      children: [
        new ImageRun({
          data: imgBuf,
          transformation: { width: widthPx, height: heightPx },
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 95 },
      children: [
        new TextRun({
          text: caption,
          font: FONT,
          size: 18.5,
          italics: true,
          color: '475569',
        }),
      ],
    }),
  ];
}

function makeTable(headers, rows) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
  const borders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map(
          (h) =>
            new TableCell({
              borders,
              shading: { fill: '0F172A', type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 50, after: 50 },
                  children: [new TextRun({ text: h, font: FONT, size: 18.5, bold: true, color: 'FFFFFF' })],
                }),
              ],
            })
        ),
      }),
      ...rows.map(
        (r, idx) =>
          new TableRow({
            children: r.map(
              (cell) =>
                new TableCell({
                  borders,
                  shading: idx % 2 === 1 ? { fill: 'F8FAFC', type: ShadingType.CLEAR } : undefined,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 40, after: 40 },
                      children: [new TextRun({ text: String(cell), font: FONT, size: 18.5, color: '1E293B' })],
                    }),
                  ],
                })
            ),
          })
      ),
    ],
  });
}

// Extract Batumi experiment table rows
const sweepRows = results.avSweepData.map((d) => [
  `${Math.round(d.avShare * 100)}%`,
  `${d.avgSpeedKmh.toFixed(1)} კმ/სთ`,
  `${Math.round(d.flowPerHour)} მანქ/სთ`,
  `${d.jamPercent.toFixed(1)}%`,
  `${d.stoppedPercent.toFixed(1)}%`,
  `${d.travelTime5kmMin.toFixed(1)} წთ`,
]);

const innerCityRows = results.innerCityData.map((d) => [
  `${Math.round(d.avShare * 100)}%`,
  `${d.avgSpeedKmh.toFixed(1)} კმ/სთ`,
  `${Math.round(d.flowPerHour)} მანქ/სთ`,
  `${d.jamPercent.toFixed(1)}%`,
  `${d.travelTime5kmMin.toFixed(1)} წთ`,
]);

const f0 = results.fundamentalData['0%'];
const f10 = results.fundamentalData['10%'];
const f20 = results.fundamentalData['20%'];
const densityIndices = [1, 2, 3, 4, 5, 6, 8]; // 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.50
const fundamentalRows = densityIndices.map((idx) => [
  `${Math.round(f0[idx].density * 100)}%`,
  `${Math.round(f0[idx].flowPerHour)} (${f0[idx].avgSpeedKmh.toFixed(1)} კმ/სთ)`,
  `${Math.round(f10[idx].flowPerHour)} (${f10[idx].avgSpeedKmh.toFixed(1)} კმ/სთ)`,
  `${Math.round(f20[idx].flowPerHour)} (${f20[idx].avgSpeedKmh.toFixed(1)} კმ/სთ)`,
]);

const doc = new Document({
  features: { updateFields: true },
  styles: {
    default: {
      document: {
        run: { font: FONT, size: 21 },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 880, bottom: 880, left: 980, right: 880 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: 'სამეცნიერო კონფერენცია — ბათუმის სატრანსპორტო ნაკადი (Nagel-Schreckenberg მოდელი)',
                  font: FONT,
                  size: 16.5,
                  color: '64748B',
                  italics: true,
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'გვერდი ', font: FONT, size: 17.5, color: '64748B' }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 17.5, color: '64748B' }),
                new TextRun({ text: ' / ', font: FONT, size: 17.5, color: '64748B' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 17.5, color: '64748B' }),
              ],
            }),
          ],
        }),
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 70 },
          children: [
            new TextRun({
              text: 'სამეცნიერო-პრაქტიკული კონფერენციის მოხსენება',
              font: FONT,
              size: 20,
              bold: true,
              color: '0369A1',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 120 },
          children: [
            new TextRun({
              text: 'საცობების წარმოქმნა ბათუმის სატრანსპორტო ქსელში (Nagel-Schreckenberg მოდელი): რატომ ჩნდება „მოჩვენებითი საცობები“ ავარიის გარეშე და როგორ ცვლის მოძრაობას ავტონომიური მანქანების 10–20%-იანი წილი',
              font: FONT,
              size: 27,
              bold: true,
              color: '0F172A',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 150 },
          children: [
            new TextRun({
              text: 'ბათუმის მაგისტრალური კორიდორები • უჯრული ავტომატები • ინტელექტუალური სატრანსპორტო სისტემები (ITS)',
              font: FONT,
              size: 18.5,
              italics: true,
              color: '475569',
            }),
          ],
        }),

        // Abstract
        h1('ანოტაცია'),
        p(
          'ბათუმის სატრანსპორტო სისტემაში, განსაკუთრებით ტურისტულ სეზონსა და პიკის საათებში, საცობების მნიშვნელოვანი ნაწილი წარმოიქმნება ყოველგვარი ავარიის ან ფიზიკური დაბრკოლების გარეშე. ამ ფენომენს „მოჩვენებითი საცობი“ (Phantom Traffic Jam) ეწოდება. წინამდებარე ნაშრომში უჯრული ავტომატების Nagel-Schreckenberg (NaSch) მოდელის გამოყენებით გამოკვლეულია ბათუმის ძირითადი სატრანსპორტო არტერიების — თამარ მეფის გამზირის (4.5 კმ, L = 600), ჭავჭავაძე–ბაგრატიონის ღერძისა (3.0 კმ, L = 400) და ხიმშიაშვილი–რუსთაველის სანაპირო მაგისტრალის (6.0 კმ, L = 800) — დინამიკა.'
        ),
        p(
          'კვლევისთვის Vite + React პლატფორმაზე შეიქმნა ბათუმის მასშტაბზე მორგებული ინტერაქტიული სიმულატორი და ჩატარდა სერიული ექსპერიმენტები შერეული ნაკადის (ადამიანის მართული HDV და ავტონომიური AV) პირობებში. შედეგებმა აჩვენა, რომ თამარ მეფის გამზირზე კრიტიკულ სიმკვრივეზე (ρ = 28%) AV-ების 10%-იანი წილი საშუალო სიჩქარესა და გამტარობას 3.8%-ით ზრდის, ხოლო 20%-იანი წილი — 9.0%-ით (1450-დან 1580 მანქ/სთ-მდე). ჭავჭავაძე–ბაგრატიონის კორიდორზე ტურისტულ პიკში (ρ = 32%) 10% AV ზრდის სიჩქარეს 5.0%-ით. ნაშრომში ჩამოყალიბებულია ბათუმის საცობების მოგვარების 6 კონკრეტული წესი.'
        ),
        pRuns([
          { text: 'საკვანძო სიტყვები: ', bold: true },
          { text: 'ბათუმის სატრანსპორტო ქსელი, Nagel-Schreckenberg მოდელი, მოჩვენებითი საცობი, ავტონომიური მანქანები (AV), ფუნდამენტური დიაგრამა, Vite სიმულაცია.' },
        ]),

        // Table of Contents
        h1('სარჩევი'),
        new TableOfContents('სარჩევი', {
          hyperlink: true,
          headingStyleRange: '1-2',
        }),
        p('შენიშვნა: გვერდების ზუსტი ნუმერაცია ავტომატურად განახლდება Microsoft Word-ში ველების განახლებისას (F9).', {
          size: 17.5,
          italics: true,
          color: '64748B',
          after: 100,
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // Chapter 1
        h1('1. შესავალი'),
        h2('1.1. ბათუმის სატრანსპორტო გამოწვევები და კვლევის აქტუალობა'),
        p(
          'ბათუმი საქართველოს ერთ-ერთი ყველაზე სწრაფად მზარდი ურბანული და ტურისტული ცენტრია, რომლის გეოგრაფიული განლაგება (ზღვის სანაპირო ზოლსა და მთებს შორის მოქცეული ვიწრო კორიდორები) ქმნის მაღალ სატრანსპორტო დატვირთვას რამდენიმე ძირითად მაგისტრალზე. მახინჯაური–ბათუმის შემოსასვლელზე (თამარ მეფის გამზირი), ასევე ჭავჭავაძის, ბაგრატიონისა და შერილ ხიმშიაშვილის ქუჩებზე მძღოლები ყოველდღიურად აწყდებიან პარადოქსულ სიტუაციას: მოძრაობა სრულად ჩერდება ყოველგვარი ავარიის ან გზის გადაკეტვის გარეშე.'
        ),
        p(
          'თანამედროვე სატრანსპორტო ფიზიკა ამ მოვლენას „მოჩვენებით საცობს“ (Phantom Traffic Jam) უწოდებს. ზაფხულის ტურისტულ სეზონზე, როდესაც ბათუმის კორიდორების სიმკვრივე აღწევს ρ = 28–35%-ს, ერთი მძღოლის მცირე დაყოვნებაც კი საკმარისია უკუსვლითი გაჩერების ტალღის წარმოსაქმნელად. აქტუალურია კითხვა: როგორ შეიძლება ამ ტალღების ჩახშობა ადაპტური კრუიზ-კონტროლისა და ავტონომიური მანქანების (AV) თუნდაც 10–20%-იანი წილის პირობებში.'
        ),

        h2('1.2. კვლევის მიზანი და ბათუმის საკვლევი კორიდორები'),
        p('კვლევის მიზანია ბათუმის რეალური მასშტაბის სატრანსპორტო მონაკვეთებზე NaSch მოდელის ადაპტაცია, 10–20% AV-ის ეფექტის რაოდენობრივი შეფასება და ქალაქის მუნიციპალური მართვის წესების შემუშავება. შესწავლილია სამი ძირითადი კორიდორი:'),
        bullet('1. თამარ მეფის გამზირი (მახინჯაური → ბათუმი): ', 'სიგრძე 4.5 კმ (L = 600 უჯრა), მაგისტრალური რეჟიმი v_max = 4 (108 კმ/სთ), პიკური სიმკვრივე ρ = 28%.'),
        bullet('2. ჭავჭავაძე – ბაგრატიონის ცენტრალური ღერძი: ', 'სიგრძე 3.0 კმ (L = 400 უჯრა), ურბანული რეჟიმი v_max = 3 (81 კმ/სთ), მაღალი სიმკვრივე ρ = 32%.'),
        bullet('3. შ. ხიმშიაშვილი – რუსთაველის სანაპირო: ', 'სიგრძე 6.0 კმ (L = 800 უჯრა), ზაფხულის ტურისტული პიკი ρ = 28–34%.'),

        // Chapter 2
        h1('2. Nagel-Schreckenberg (NaSch) მოდელის თეორიული საფუძვლები'),
        h2('2.1. უჯრული ავტომატების დისკრეტული ფორმულირება'),
        p(
          '1992 წელს კაი ნაგელმა და მაიკლ შრეკენბერგმა ჩამოაყალიბეს ერთგანზომილებიანი სტოქასტური უჯრული ავტომატის მოდელი. გზა იყოფა L უჯრად (1 უჯრა ≈ 7.5 მეტრი — მანქანის სიგრძე და უსაფრთხო ინტერვალი), ხოლო დრო იზომება Δt = 1 წამიანი ბიჯებით. შესაბამისად, 1 უჯრა/წმ = 7.5 მ/წმ = 27 კმ/სთ. ბათუმის 4.5 კმ-იანი თამარ მეფის გამზირი ზუსტად შეესაბამება L = 600 უჯრას, ხოლო 6.0 კმ-იანი სანაპირო მაგისტრალი — L = 800 უჯრას. სიმკვრივე ρ = N / L ∈ (0, 1], ხოლო წინა მანქანამდე თავისუფალი უჯრების რაოდენობაა d_i = (x_{i+1} − x_i − 1) mod L.'
        ),

        h2('2.2. მოძრაობის 4 ძირითადი წესი და ფუნდამენტური დიაგრამა'),
        p('ყოველ ბიჯზე t → t + 1 ყველა მანქანა სინქრონულად ასრულებს ოთხ წესს:'),
        bullet('წესი 1 — აჩქარება: ', 'v_i ← min(v_i + 1, v_max) — მძღოლის სწრაფვა დასაშვები სიჩქარისკენ.'),
        bullet('წესი 2 — დამუხრუჭება: ', 'v_i ← min(v_i, d_i) — შეჯახების თავიდან აცილება.'),
        bullet('წესი 3 — სტოქასტური დაყოვნება: ', 'p ალბათობით v_i ← max(v_i − 1, 0) — ადამიანის რეაქციის დაგვიანება და არაოპტიმალური მუხრუჭი (p_human ≈ 0.30).'),
        bullet('წესი 4 — გადაადგილება: ', 'x_i ← (x_i + v_i) mod L.'),
        p(
          'ნაკადსა (q = ρ · v̄ მანქ/სთ) და სიმკვრივეს (ρ) შორის კავშირი ქმნის ფუნდამენტურ დიაგრამას. კრიტიკულ სიმკვრივეზე ρ_c (ბათუმის პირობებში ≈ 15–20%) ნაკადი აღწევს პიკს, რის შემდეგაც იწყება გადატვირთული ფაზა და გამტარობა მკვეთრად ეცემა.'
        ),

        // Chapter 3
        h1('3. „მოჩვენებითი საცობების“ ფენომენი ავარიის გარეშე'),
        h2('3.1. სტოქასტური დაყოვნება და ადამიანური ფაქტორი'),
        p(
          'როდესაც p = 0 (იდეალური მძღოლი), საშუალო სიმკვრივეზეც კი საცობი არ ჩნდება. ბათუმის ქუჩებში კი ადამიანი მძღოლის რეაქციის დაყოვნება (p_human = 0.30–0.32), ტურისტული ავტობუსების მანევრირება და ქვეითთა გადასასვლელებთან მკვეთრი შენელება ქმნის მუდმივ მიკრო-ფლუქტუაციებს.'
        ),

        h2('3.2. მეტასტაბილურობა და უკუსვლითი დარტყმითი ტალღები'),
        p(
          'კრიტიკულ სიმკვრივეზე (ρ ≥ 20%) ერთი მანქანის წამიერი შენელება ამცირებს უკანა მანქანის დისტანციას d_i. ჯაჭვური დამუხრუჭების შედეგად რამდენიმე წამში ჩნდება სრულად გაჩერებული მანქანა (v = 0). ეს გაჩერების ზონა მოძრაობს უკან, ნაკადის საწინააღმდეგოდ (v_jam < 0). შედეგად, მახინჯაურიდან ბათუმში მომავალი მძღოლი ხვდება საცობში მაშინაც კი, როცა წინ გზა სრულიად თავისუფალია და ავარია არ მომხდარა.'
        ),

        // Chapter 4
        h1('4. ავტონომიური მანქანების (AV) გავლენა 10–20%-იანი წილის პირობებში'),
        h2('4.1. შერეული ნაკადის (HDV + AV) მოდელირება'),
        p(
          'ავტონომიური და თანამედროვე CACC (Cooperative Adaptive Cruise Control) სისტემით აღჭურვილი მანქანები რეაგირებენ მყისიერად (p_AV ≈ 0.02). ჩვენს მოდელში AV-ები იყენებენ ტალღის შთანთქმის (Jam-Absorption) წესს: თუ წინა მანქანა ანელებს, AV წინასწარ, რბილად არეგულირებს სიჩქარეს, რითაც ინარჩუნებს ბუფერულ სივრცეს და არ ჩერდება ნულოვან სიჩქარეზე.'
        ),

        h2('4.2. მოძრავი დემპფერის ეფექტი ბათუმის პიკურ ნაკადში'),
        p(
          'ბათუმის მაგისტრალებზე სრული ავტონომიზაცია (100% AV) უახლოეს წლებში არარეალურია, თუმცა 10–20%-იანი წილი (მაგ., მუნიციპალური ავტობუსების, ელექტრომობილებისა და ტაქსის ფლოტის CACC-ით აღჭურვა) სრულიად მიღწევადია. ყოველი მე-5 ან მე-10 მანქანა მოქმედებს როგორც „მოძრავი დემპფერი“, რომელიც წყვეტს ადამიანური დამუხრუჭების ჯაჭვურ რეაქციას და ასტაბილურებს მთელ კორიდორს.'
        ),

        // Chapter 5
        h1('5. კვლევის მეთოდოლოგია და ბათუმის მასშტაბის ექსპერიმენტები'),
        h2('5.1. თამარ მეფის გამზირის (4.5 კმ) ფუნდამენტური დიაგრამა'),
        p(
          'პირველ ექსპერიმენტში მოვახდინეთ თამარ მეფის გამზირის (L = 600, 4.5 კმ, v_max = 4) სიმულაცია ρ ∈ [5%, 70%] სიმკვრივეზე (10–12 თესლი, 400 გახურების და 700–800 საზომი ბიჯი). სურათ 1-ზე და ცხრილ 1-ში ჩანს, რომ 15–35% სიმკვრივეზე 10% და 20% AV სისტემატურად ზრდის გამტარობას.'
        ),
        ...imageBlock(
          'chart_fundamental.png',
          'სურათი 1: ბათუმის (თამარ მეფის გამზირი, 4.5 კმ) ფუნდამენტური დიაგრამა 0%, 10%, 20% და 50% AV-სთვის.',
          485,
          258
        ),
        p('ცხრილი 1: თამარ მეფის გამზირის გამტარობა (მანქ/სთ) და საშ. სიჩქარე სიმკვრივის მიხედვით:', {
          bold: true,
          size: 19.5,
          after: 50,
        }),
        makeTable(
          ['სიმკვრივე (ρ)', '0% AV (ნაკადი / სიჩქარე)', '10% AV (ნაკადი / სიჩქარე)', '20% AV (ნაკადი / სიჩქარე)'],
          fundamentalRows
        ),

        h2('5.2. 10–20% AV-ის გავლენა სიჩქარესა და 5 კმ მგზავრობის დროზე'),
        p(
          'მეორე ექსპერიმენტში გავზომეთ AV წილის ეფექტი თამარ მეფის გამზირის პიკურ სიმკვრივეზე (ρ = 28%, 168 მანქანა 4.5 კმ-ზე), ხოლო მესამე ექსპერიმენტში — ჭავჭავაძე–ბაგრატიონის ღერძზე (L = 400, 3.0 კმ, ρ = 32%). ცხრილი 2-ის მიხედვით, 20% AV-ზე გამტარობა იზრდება 1450-დან 1580 მანქ/სთ-მდე (+9.0%), ხოლო ჭავჭავაძე–ბაგრატიონზე 10% AV-იც კი ზრდის სიჩქარეს 30.9-დან 32.4 კმ/სთ-მდე (+5.0%).'
        ),
        ...imageBlock(
          'chart_av_impact.png',
          'სურათი 2: AV წილის გავლენა სიჩქარესა და საცობში მყოფი მანქანების წილზე ბათუმის მაგისტრალზე (ρ = 28%).',
          485,
          242
        ),
        p('ცხრილი 2: AV წილის ეფექტი ბათუმის თამარ მეფის გამზირზე (ρ = 28%, L = 600):', {
          bold: true,
          size: 19.5,
          after: 50,
        }),
        makeTable(
          ['AV წილი', 'საშ. სიჩქარე', 'ნაკადი (q)', 'საცობში (v≤1)', 'გაჩერებული (v=0)', '5 კმ მგზავრობა'],
          sweepRows
        ),
        p('ცხრილი 2ბ: ჭავჭავაძე – ბაგრატიონის ცენტრალური ღერძი (3.0 კმ, ტურისტული პიკი ρ = 32%):', {
          bold: true,
          size: 19.5,
          after: 50,
        }),
        makeTable(
          ['AV წილი', 'საშ. სიჩქარე', 'ნაკადი (q)', 'საცობში (v≤1)', '5 კმ მგზავრობა'],
          innerCityRows
        ),
        ...imageBlock(
          'chart_spacetime_compare.png',
          'სურათი 3: ბათუმის მაგისტრალის სივრცე-დროის დიაგრამა (ρ = 28%) — 0% AV (მარცხნივ) vs 20% AV (მარჯვნივ).',
          495,
          208
        ),

        // Chapter 6
        h1('6. ბათუმის საცობების მოგვარების წესები და რეკომენდაციები'),
        p(
          'ჩატარებული სიმულაციების საფუძველზე, ბათუმის სატრანსპორტო ქსელში მოჩვენებითი საცობების აღმოსაფხვრელად შემუშავდა 6 პრაქტიკული წესი:'
        ),

        h2('6.1. ტექნოლოგიური და ავტოპარკის მართვის წესები'),
        bullet(
          'წესი 1 — მუნიციპალური ტრანსპორტისა და ტაქსის ფლოტის 10–20% CACC სტანდარტიზაცია: ',
          'ბათუმის ავტობუსებისა და ლიცენზირებული ტაქსების ნაწილის აღჭურვა ადაპტური კრუიზ-კონტროლით (p_AV ≤ 0.02) ქმნის საკმარის დემპფერულ ბადეს ხიმშიაშვილისა და ჭავჭავაძის ღერძებზე.'
        ),
        bullet(
          'წესი 2 — ტალღის შთანთქმის (Jam-Absorption) რეჟიმი: ',
          'AV/CACC სისტემებმა უნდა გამოიყენონ პროგნოზული დამუხრუჭება წინა ნაკადის შენელებისას, რათა გამოირიცხოს სრული გაჩერება (v = 0).'
        ),

        h2('6.2. ბათუმის მაგისტრალების მართვის წესები'),
        bullet(
          'წესი 3 — მახინჯაური–ბათუმის შემოსასვლელზე Ramp Metering: ',
          'E-70 მაგისტრალისა და მეორეხარისხოვანი შესასვლელების დოზირებული მართვა არ დაუშვებს თამარ მეფის გამზირზე სიმკვრივის გადაჭარბებას ρ_c ≈ 25%-ზე.'
        ),
        bullet(
          'წესი 4 — სანაპირო მაგისტრალის დინამიკური VSL ჰარმონიზაცია: ',
          'ტურისტულ პიკში ხიმშიაშვილი–რუსთაველის ღერძზე სიჩქარის დინამიკური შეზღუდვა (50–60 კმ/სთ) ამცირებს სიჩქარის დისპერსიას და იცავს ნაკადს ფაზური ჩავარდნისგან.'
        ),

        h2('6.3. ურბანული დისციპლინის წესები'),
        bullet(
          'წესი 5 — ჭავჭავაძე–ბაგრატიონის „მწვანე ტალღა“ და ბუფერული დისტანცია: ',
          'შუქნიშნების კოორდინაცია და 2-წამიანი დისტანციის დაცვა ამცირებს ადამიანის სტოქასტური დაყოვნების (p_human) გავლენას.'
        ),
        bullet(
          'წესი 6 — ზოლის უმიზეზო ცვლის შეზღუდვა პიკის საათებში: ',
          'ხშირი გადასწრება ზრდის ეფექტურ p-ს; მყარი ხაზებისა და „ზიპერის“ წესის დაცვა სტაბილურ გამტარობას ინარჩუნებს.'
        ),

        h2('6.4. ახალი გზებისა და ინფრასტრუქტურის იდეები ბათუმში (სიმკვრივის ρ-ს შესამცირებლად)'),
        bullet(
          '1. ბათუმის შემოვლითი მაგისტრალის (E-70) სრული ინტეგრაცია: ',
          'ტრანზიტული ტრაილერებისა და ტურისტული ნაკადის გატარება მახინჯაური–ხელვაჩაური–სარფის შემოვლით გზაზე ქალაქის ცენტრში სიმკვრივეს ρ ≈ 32%-დან 18–20%-მდე დაწევს.'
        ),
        bullet(
          '2. პარალელური დუბლიორი კორიდორი და ჭოროხის მეორე ხიდი: ',
          'ფრიდონ ხალვაშის გამზირისა და ბაგრატიონის დამაკავშირებელი დუბლიორი არტერია, ასევე ჭოროხის ახალი ხიდი და ადლია–გონიოს სანაპირო გზა გაყოფს ნაკადს და გააქრობს „ბოთლის ყელს“.'
        ),
        bullet(
          '3. მრავალდონიანი კვანძები და Park & Ride ჰაბები: ',
          'ესტაკადები მახინჯაურის შესასვლელთან, ბონის კვანძთან და ბაგრატიონი–აღმაშენებლის კვეთაზე, ასევე Park & Ride პარკინგები ქალაქის შესასვლელებში (ელექტრო-ავტობუსებით ცენტრში გადასაყვანად).'
        ),

        p('ცხრილი 3: ბათუმის საცობების მოგვარების წესების შემაჯამებელი მატრიცა:', { bold: true, size: 19.5, after: 50 }),
        makeTable(
          ['წესი', 'ბათუმის ლოკაცია / სფერო', 'მოსალოდნელი ეფექტი'],
          [
            ['1. 10–20% CACC ფლოტი', 'ავტობუსები და ტაქსები (მთელი ქალაქი)', 'სიჩქარის +5–9% ზრდა, ტალღების შთანთქმა'],
            ['2. Jam-Absorption მართვა', 'შერეული ნაკადი (AV/ACC)', 'v = 0 გაჩერებების კლება'],
            ['3. Ramp Metering', 'მახინჯაური – თამარ მეფის გამზირი', 'აკონტროლებს ρ ≤ 25% ზღვარს'],
            ['4. დინამიკური VSL', 'ხიმშიაშვილი – რუსთაველის სანაპირო', 'ამცირებს სიჩქარის დისპერსიას'],
            ['5. „მწვანე ტალღა“ + დისტანცია', 'ჭავჭავაძე – ბაგრატიონის ღერძი', 'ამცირებს p_human-ს და 5 კმ დროს'],
            ['6. ზოლის დისციპლინა', 'პიკური ურბანული კვანძები', 'სტაბილური გამტარობა სეზონზე'],
          ]
        ),

        // Chapter 7
        h1('7. ბათუმის სიმულაციური პროგრამის არქიტექტურა (Vite + React)'),
        h2('7.1. მოდულური სტრუქტურა და ბათუმის კორიდორების კონფიგურაცია'),
        p(
          'სიმულაციური პროგრამა აწყობილია Vite v5.4-ისა და React v18.3-ის ბაზაზე. გამოთვლითი ბირთვი (src/simulation/nasch.js) ახორციელებს NaSch მოდელის ოთხივე წესს Mulberry32 დეტერმინისტული გენერატორით, ხოლო src/simulation/batumiCorridors.js მოდული განსაზღვრავს ბათუმის ოთხ რეალურ კორიდორს (3.0 კმ-დან 7.5 კმ-მდე მასშტაბით).'
        ),

        h2('7.2. ინტერაქტიული ვიზუალიზაცია'),
        p(
          'ინტერფეისი (src/App.jsx) იძლევა კორიდორის არჩევის, 0%/10%/20% AV და „ზაფხულის ტურისტული პიკის (34%)“ პრესეტების გაშვების საშუალებას. ეკრანზე რეალურ დროში აისახება წრიული გზის ანიმაცია (RingRoadCanvas.jsx), სივრცე-დროის დიაგრამა (SpaceTimeCanvas.jsx), ფუნდამენტური დიაგრამა (FundamentalChart.jsx) და 5 კმ მგზავრობის დრო წუთებში.'
        ),

        // Chapter 8
        h1('8. დასკვნა'),
        p(
          'ბათუმის მასშტაბზე ჩატარებულმა კვლევამ Nagel-Schreckenberg მოდელისა და Vite სიმულატორის გამოყენებით დაადასტურა, რომ ქალაქის მთავარ მაგისტრალებზე „მოჩვენებითი საცობები“ ავარიის გარეშე ჩნდება კრიტიკულ სიმკვრივეზე (ρ ≥ 20%) მძღოლთა სტოქასტური დაყოვნების (p > 0) ჯაჭვური გაძლიერებით. თამარ მეფის გამზირზე (4.5 კმ) ავტონომიური ან CACC სისტემით აღჭურვილი მანქანების 10%-იანი წილი ზრდის გამტარობას 3.8%-ით, ხოლო 20%-იანი წილი — 9.0%-ით (1450-დან 1580 მანქ/სთ-მდე). ჭავჭავაძე–ბაგრატიონის კორიდორზე ტურისტულ პიკში 10% AV ზრდის სიჩქარეს 5.0%-ით.'
        ),
        p(
          'საცობების პრობლემის საბოლოოდ გადასაჭრელად აუცილებელია ორი მიმართულების სინთეზი: (1) ინფრასტრუქტურული განტვირთვა — ბათუმის შემოვლითი გზის სრული გამოყენება, ჭოროხის მეორე ხიდისა და ადლია–გონიოს სანაპირო დუბლიორის მშენებლობა, მახინჯაურისა და ბონის ესტაკადები და Park & Ride ჰაბები (რაც სიმკვრივეს ρ < 20%-მდე შეამცირებს); (2) ჭკვიანი მართვა — 10–20% CACC ავტობუსებსა და ტაქსებში, Ramp Metering და დინამიკური VSL, რაც უზრუნველყოფს სტაბილურ და უსაფრთხო მოძრაობას ბათუმში.'
        ),

        // Chapter 9
        h1('9. გამოყენებული ლიტერატურა'),
        bullet('1. Nagel, K., & Schreckenberg, M. (1992). ', 'A cellular automaton model for freeway traffic. Journal de Physique I, 2(12), 2221–2229.'),
        bullet('2. Sugiyama, Y., et al. (2008). ', 'Traffic jams without bottlenecks — experimental evidence for the physical mechanism of the formation of a jam. New Journal of Physics, 10(3), 033001.'),
        bullet('3. Stern, R. E., et al. (2018). ', 'Dissipation of stop-and-go waves via control of autonomous vehicles: Field experiments. Transportation Research Part C, 89, 205–221.'),
        bullet('4. Kerner, B. S. (2004). ', 'The Physics of Traffic: Empirical Freeway Pattern Features, Engineering Applications, and Theory. Springer.'),
        bullet('5. Chowdhury, D., Santen, L., & Schadschneider, A. (2000). ', 'Statistical physics of vehicular traffic and some related systems. Physics Reports, 329(4-6), 199–329.'),
      ],
    },
  ],
});

const outDocPath = path.resolve('საცობების_წარმოქმნა_Nagel_Schreckenberg.docx');
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outDocPath, buffer);
console.log('Generated Batumi Word document:', outDocPath);
