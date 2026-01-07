import { jsPDF } from "jspdf";

const getBase64FromUrl = async (url) => {
    try {
        const data = await fetch(url);
        const blob = await data.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => resolve(reader.result);
        });
    } catch (e) {
        console.error("Image load failed", e);
        return null;
    }
};

const getCategoryBadge = (text) => {
    if (!text) return { label: "DETAIL", color: [161, 161, 170] }; // Zinc-400
    const lower = text.toLowerCase();
    if (lower.includes('where') || lower.includes('place')) return { label: "LOCATION", color: [24, 24, 27] }; // Zinc-950
    if (lower.includes('who')) return { label: "CHARACTER", color: [24, 24, 27] };
    if (lower.includes('what') && (lower.includes('eat') || lower.includes('food'))) return { label: "FOOD", color: [24, 24, 27] };
    if (lower.includes('when') || lower.includes('time')) return { label: "TIME", color: [24, 24, 27] };
    return { label: "DETAIL", color: [161, 161, 170] };
};

export const generatePDF = async (activity, mascotUrl, isScaffolded) => {
    if (!activity) return;
    const doc = new jsPDF();
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const Qm = 20; // margin

    // Layout Constants
    const sidebarW = (width - (Qm * 2)) * 0.30;
    const mainW = (width - (Qm * 2)) * 0.65;
    const gutter = (width - (Qm * 2)) * 0.05;
    const sidebarX = Qm + mainW + gutter;

    // Colors
    const blackRGB = [9, 9, 11]; // Zinc-950
    const grayRGB = [113, 113, 122]; // Zinc-500

    let cursorY = 0;
    let pageNumber = 1;

    const drawFooter = (pNum) => {
        doc.setFontSize(8);
        doc.setTextColor(...grayRGB);
        doc.setFont("helvetica", "normal");
        doc.text(`Page ${pNum}  •  arc / ${activity.title}`, Qm, height - 10);
    };

    const drawSidebar = () => {
        let sideY = 55;
        if (activity.student_worksheet.glossary?.length > 0) {
            doc.setTextColor(...blackRGB);
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("VOCABULARY", sidebarX, sideY);

            sideY += 10;
            doc.setTextColor(50, 50, 50);
            activity.student_worksheet.glossary.forEach((item) => {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.text(item.word, sidebarX, sideY);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                const defLines = doc.splitTextToSize(item.definition, sidebarW);
                doc.text(defLines, sidebarX, sideY + 4);
                sideY += (defLines.length * 4) + 8;
            });
        }
    };

    const checkSpace = (required) => {
        if (cursorY + required > height - 20) {
            drawFooter(pageNumber);
            doc.addPage();
            pageNumber++;
            cursorY = 20;
            drawSidebar();
        }
    };

    drawSidebar();

    // Header
    doc.setTextColor(...blackRGB);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text(activity.title, Qm, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayRGB);
    doc.text(`${(activity.meta?.level || 'A1').toUpperCase()}  •  ${(activity.meta?.type || 'LESSON').toUpperCase()}  •  20 MIN`, Qm, 30);

    // Divider
    doc.setDrawColor(230, 230, 230);
    doc.line(Qm, 38, width - Qm, 38);

    // Mascot
    if (mascotUrl) {
        try {
            const base64Img = await getBase64FromUrl(mascotUrl);
            if (base64Img) {
                doc.addImage(base64Img, 'JPEG', width - Qm - 25, 10, 25, 25);
            }
        } catch (e) { console.error(e); }
    }

    cursorY = 55;
    doc.setTextColor(...grayRGB);
    doc.setFontSize(9);
    doc.text("Name ___________________________", Qm, cursorY);
    cursorY += 20;

    // Instructions
    doc.setTextColor(...blackRGB);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("INSTRUCTIONS", Qm, cursorY);
    cursorY += 6;
    doc.setFont("helvetica", "normal");
    const instrLines = doc.splitTextToSize(activity.student_worksheet.instructions, mainW);
    doc.text(instrLines, Qm, cursorY);
    cursorY += (instrLines.length * 5) + 15;

    // Questions
    activity.student_worksheet.questions.forEach((q, i) => {
        doc.setFontSize(11);
        const qLines = doc.splitTextToSize(`${i + 1}. ${q.question_text}`, mainW);
        let boxH = (qLines.length * 6) + 20; // Increased spacing for badge
        if (q.options) boxH += (q.options.length * 7) + 5;
        else boxH += 15;

        checkSpace(boxH);

        // Badge
        const badge = getCategoryBadge(q.question_text);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...badge.color);
        doc.text(badge.label, Qm, cursorY);

        // Icon emulation (small dot)
        doc.setFillColor(...badge.color);
        doc.circle(Qm - 3, cursorY - 1, 1, 'F');

        cursorY += 5;

        doc.setTextColor(...blackRGB);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(qLines, Qm, cursorY);

        let localY = cursorY + (qLines.length * 5) + 4;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        if (q.options) {
            q.options.forEach(opt => {
                doc.setDrawColor(200);
                doc.circle(Qm + 2, localY - 1, 1.5);
                doc.setTextColor(60);
                doc.text(opt, Qm + 8, localY);
                localY += 7;
            });
        } else {
            doc.setDrawColor(230);
            doc.line(Qm, localY + 8, Qm + mainW, localY + 8);
            localY += 12;
        }

        if (q.hint && isScaffolded) {
            doc.setTextColor(100);
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.text(`Hint: ${q.hint}`, Qm, localY);
            localY += 8;
        }
        cursorY = localY + 10;
    });

    drawFooter(pageNumber);
    doc.save(`arc_lesson_${activity.title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
};