import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        # Suppress running header/footer on cover page (page 1)
        if self._pageNumber > 1:
            # Running Header
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#475569"))
            self.drawString(54, 11 * inch - 36, "DOCSAFE: EVIDENCE CHAIN PROTOCOL")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawRightString(8.5 * inch - 54, 11 * inch - 36, "Algorithms & Technical System Specification")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.75)
            self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)

            # Running Footer
            self.line(54, 46, 8.5 * inch - 54, 46)
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawString(54, 32, "Cryptographic Architecture & Algorithm Explanation Document • DocSafe v2.0")
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#1E293B"))
            self.drawRightString(8.5 * inch - 54, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf(filename="DocSafe_Algorithms_and_Technical_Explanation.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Palette
    c_primary = colors.HexColor("#0F172A")    # Slate 900
    c_secondary = colors.HexColor("#1E40AF")  # Blue 800
    c_accent = colors.HexColor("#0D9488")     # Teal 600
    c_alert = colors.HexColor("#B91C1C")      # Red 700
    c_card_bg = colors.HexColor("#F8FAFC")    # Slate 50
    c_code_bg = colors.HexColor("#0F172A")    # Dark slate
    c_border = colors.HexColor("#E2E8F0")     # Slate 200

    # Typography styles
    style_cover_title = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary,
        alignment=0,
        spaceAfter=8
    )

    style_cover_subtitle = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#334155"),
        spaceAfter=15
    )

    style_meta_badge = ParagraphStyle(
        'MetaBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1E3A8A")
    )

    style_h1 = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    style_h2 = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=c_secondary,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    style_h3 = ParagraphStyle(
        'Heading3_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )

    style_body = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )

    style_body_bold = ParagraphStyle(
        'BodyBold_Custom',
        parent=style_body,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#0F172A")
    )

    style_bullet = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=3
    )

    style_code_header = ParagraphStyle(
        'CodeHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    style_code_text = ParagraphStyle(
        'CodeText',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#E2E8F0")
    )

    style_code_keyword = ParagraphStyle(
        'CodeKeyword',
        parent=style_code_text,
        textColor=colors.HexColor("#38BDF8")
    )

    style_callout = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1E293B")
    )

    style_th = ParagraphStyle(
        'TableHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.white,
        alignment=0
    )

    style_td = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#1E293B")
    )

    style_td_mono = ParagraphStyle(
        'TableCellMono',
        parent=style_td,
        fontName='Courier',
        fontSize=7.5,
        leading=9.5
    )

    story = []

    def make_algorithm_box(algo_num, title, complexity, inputs, outputs, pseudocode_lines):
        content = []
        # Header banner
        header_p = Paragraph(f"<b>ALGORITHM {algo_num}:</b> {title.upper()}", style_code_header)
        complexity_p = Paragraph(f"<b>Time:</b> {complexity['time']} | <b>Gas:</b> {complexity['gas']}", ParagraphStyle('Comp', parent=style_code_header, alignment=2))
        
        banner_table = Table([[header_p, complexity_p]], colWidths=[330, 174])
        banner_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_primary),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        content.append(banner_table)

        # I/O row
        io_text = f"<b>Inputs:</b> {inputs}<br/><b>Outputs:</b> {outputs}"
        io_p = Paragraph(io_text, ParagraphStyle('IO', parent=style_body, fontSize=8, leading=11, textColor=colors.HexColor("#1E293B")))
        io_table = Table([[io_p]], colWidths=[504])
        io_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ]))
        content.append(io_table)

        # Code block lines
        code_p = Paragraph("<br/>".join(pseudocode_lines), style_code_text)
        code_table = Table([[code_p]], colWidths=[504])
        code_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_code_bg),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('BOX', (0,0), (-1,-1), 0.5, c_primary),
        ]))
        content.append(code_table)
        content.append(Spacer(1, 6))
        return KeepTogether(content)

    def make_callout(title, text, kind="info"):
        bg_col = colors.HexColor("#EFF6FF")
        border_col = colors.HexColor("#3B82F6")
        if kind == "warning":
            bg_col = colors.HexColor("#FEF2F2")
            border_col = colors.HexColor("#EF4444")
        elif kind == "success":
            bg_col = colors.HexColor("#ECFDF5")
            border_col = colors.HexColor("#10B981")

        p = Paragraph(f"<b>{title}:</b> {text}", style_callout)
        t = Table([[p]], colWidths=[504])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), bg_col),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('LINELEFT', (0,0), (0,0), 3, border_col),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ]))
        return t

    # =========================================================================
    # DOCUMENT HEADER / COVER BANNER
    # =========================================================================
    story.append(Paragraph("DOCSAFE EVIDENCE CHAIN PROTOCOL", style_meta_badge))
    story.append(Paragraph("Complete Algorithms & Technical System Specification", style_cover_title))
    story.append(Paragraph(
        "A Comprehensive Formal Exposition of Cryptographic Hashing, Dual-Party Consensus, "
        "Algorithm 2 Dispute Resolution, Decentralized IPFS Storage, Role-Based Access Control, "
        "and Tamper-Evident Court-Admissible Chain-of-Custody",
        style_cover_subtitle
    ))

    # Meta banner
    meta_data = [
        [
            Paragraph("<b>Protocol:</b> DocSafe Ethereum Engine v2.0", style_td),
            Paragraph("<b>Target Network:</b> Ethereum EVM / Hardhat 31337", style_td),
            Paragraph("<b>Storage:</b> IPFS + SQLite Embedded", style_td),
        ],
        [
            Paragraph("<b>Smart Contract:</b> DocumentVerification.sol", style_td),
            Paragraph("<b>Crypto Primitives:</b> SHA-256, ECDSA secp256k1", style_td),
            Paragraph("<b>Standard:</b> Court-Admissible Evidence Chain", style_td),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[168, 168, 168])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=10))

    # =========================================================================
    # SECTION 1: ARCHITECTURAL BLUEPRINT & MENTAL MODEL
    # =========================================================================
    story.append(Paragraph("1. System Architecture & The 4-Layer Mental Model", style_h1))
    story.append(Paragraph(
        "The DocSafe Evidence Chain system solves the fundamental challenges of digital forensic evidence management: "
        "unauthorized tampering, broken chains of custody, unilateral overwrites, opaque handling, and the excessive cost "
        "of raw blockchain storage. Rather than storing large evidentiary files (such as high-resolution autopsy photographs, "
        "forensic laboratory reports, or surveillance CCTV footage) directly on-chain, DocSafe operates on a <b>four-layer hybrid architecture</b>:",
        style_body
    ))

    layers_info = [
        [
            Paragraph("<b>Layer</b>", style_th),
            Paragraph("<b>Components & Technology</b>", style_th),
            Paragraph("<b>Forensic & Cryptographic Responsibilities</b>", style_th),
        ],
        [
            Paragraph("<b>Layer 1:<br/>Presentation & Web3 Client</b>", style_td),
            Paragraph("React 19, Vite, Wagmi v2, Viem v2, MetaMask EIP-1193", style_td),
            Paragraph("User interaction, local SHA-256 pre-hashing, transaction signature creation, role routing, visual timeline rendering, and court certificate generation.", style_td),
        ],
        [
            Paragraph("<b>Layer 2:<br/>Gateway & Metadata Engine</b>", style_td),
            Paragraph("Node.js 24, Express, Native SQLite DatabaseSync, Pinata SDK", style_td),
            Paragraph("Off-chain case metadata persistence (case numbers, forensic categories, notes), server-side SHA-256 verification, IPFS pinning orchestration, proxy streaming with integrity headers.", style_td),
        ],
        [
            Paragraph("<b>Layer 3:<br/>Decentralized Storage</b>", style_td),
            Paragraph("InterPlanetary File System (IPFS), UnixFS, Content Addressing", style_td),
            Paragraph("Permanent, distributed off-chain storage. Files are addressed strictly by their cryptographic Content Identifier (CID). Any mutation results in a distinct CID.", style_td),
        ],
        [
            Paragraph("<b>Layer 4:<br/>Consensus & Ledger</b>", style_td),
            Paragraph("Ethereum EVM, Solidity 0.8.0+, DocumentVerification Contract", style_td),
            Paragraph("Immutable state machine enforcement: dual-party consent gates, multi-validator dispute arbitration (Algorithm 2), viewer access control, and tamper-proof event logs.", style_td),
        ],
    ]
    t_layers = Table(layers_info, colWidths=[90, 150, 264])
    t_layers.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('BOX', (0,0), (-1,-1), 1, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_layers)
    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 2: ALGORITHM 1
    # =========================================================================
    story.append(Paragraph("2. Algorithm 1: Evidence Creation & Dual-Party Authorization Protocol", style_h1))
    story.append(Paragraph(
        "<b>Purpose:</b> Enforces a strict two-stage ingestion protocol preventing unauthorized, unsolicited, or unvetted "
        "evidence from polluting the evidentiary chain. A provider cannot unilaterally upload files; an empty container "
        "must first be initialized and explicitly consented to by the designated recipient.",
        style_body
    ))

    algo1_code = [
        "<font color='#38BDF8'><b>Algorithm 1:</b></font> Evidence Container Creation and Dual-Party Consent Gate",
        "<font color='#94A3B8'>1:</font> <b>procedure</b> <font color='#FACC15'>ADD_EMPTY_DOCUMENT</font>(<i>recipient_addr</i>)",
        "<font color='#94A3B8'>2:</font>   <b>require</b> <i>msg.sender</i> != <i>recipient_addr</i> <b>and</b> <i>recipient_addr</i> != 0x0",
        "<font color='#94A3B8'>3:</font>   <i>docId</i> &larr; <i>documentCount</i> + 1",
        "<font color='#94A3B8'>4:</font>   <i>documents</i>[<i>docId</i>] &larr; Document(ipfsHash=\"\", provider=<i>msg.sender</i>, recipient=<i>recipient_addr</i>,",
        "<font color='#94A3B8'>5:</font>                         isValid=false, isInChangePhase=false, proof=\"\", sha256=\"\", isRejected=false)",
        "<font color='#94A3B8'>6:</font>   <i>viewers</i>[<i>msg.sender</i>][<i>docId</i>] &larr; true; <i>viewers</i>[<i>recipient_addr</i>][<i>docId</i>] &larr; true",
        "<font color='#94A3B8'>7:</font>   <b>emit</b> DocumentAdded(<i>docId</i>, <i>msg.sender</i>, <i>recipient_addr</i>, \"\")",
        "<font color='#94A3B8'>8:</font>   <b>return</b> <i>docId</i>",
        "<font color='#94A3B8'>9:</font> <b>end procedure</b>",
        "<font color='#94A3B8'>10:</font>",
        "<font color='#94A3B8'>11:</font> <b>procedure</b> <font color='#FACC15'>APPROVE_DOCUMENT_CHANGE</font>(<i>docId</i>)",
        "<font color='#94A3B8'>12:</font>   <b>require</b> <i>msg.sender</i> == <i>documents</i>[<i>docId</i>].recipient",
        "<font color='#94A3B8'>13:</font>   <b>require</b> <i>documents</i>[<i>docId</i>].isRejected == false",
        "<font color='#94A3B8'>14:</font>   <i>approvals</i>[<i>msg.sender</i>][<i>docId</i>] &larr; true",
        "<font color='#94A3B8'>15:</font> <b>end procedure</b>",
        "<font color='#94A3B8'>16:</font>",
        "<font color='#94A3B8'>17:</font> <b>procedure</b> <font color='#FACC15'>UPDATE_DOCUMENT</font>(<i>docId</i>, <i>ipfsCid</i>, <i>sha256Hex</i>)",
        "<font color='#94A3B8'>18:</font>   <b>require</b> <i>msg.sender</i> == <i>documents</i>[<i>docId</i>].provider",
        "<font color='#94A3B8'>19:</font>   <b>require</b> <i>approvals</i>[<i>documents</i>[<i>docId</i>].recipient][<i>docId</i>] == true",
        "<font color='#94A3B8'>20:</font>   <b>require</b> <i>documents</i>[<i>docId</i>].isRejected == false",
        "<font color='#94A3B8'>21:</font>   <i>documents</i>[<i>docId</i>].ipfsHash &larr; <i>ipfsCid</i>",
        "<font color='#94A3B8'>22:</font>   <i>documents</i>[<i>docId</i>].sha256Hash &larr; <i>sha256Hex</i>",
        "<font color='#94A3B8'>23:</font>   <i>documents</i>[<i>docId</i>].isValid &larr; false",
        "<font color='#94A3B8'>24:</font>   <i>approvals</i>[<i>documents</i>[<i>docId</i>].recipient][<i>docId</i>] &larr; false  <font color='#64748B'>// Consumes one-time authorization token</font>",
        "<font color='#94A3B8'>25:</font>   <b>emit</b> DocumentUpdated(<i>docId</i>, <i>ipfsCid</i>)",
        "<font color='#94A3B8'>26:</font> <b>end procedure</b>",
    ]
    story.append(make_algorithm_box(
        "1", "Evidence Creation & Dual-Party Authorization Protocol",
        {"time": "O(1)", "gas": "~85,000 to ~120,000 gas"},
        "recipientAddress, caseMetadata, evidenceFile",
        "docId, IPFS CID, on-chain DocumentAdded and DocumentUpdated events",
        algo1_code
    ))

    story.append(Paragraph("<b>Technical Analysis & Invariants:</b>", style_h3))
    story.append(Paragraph(
        "• <b>Two-Phase Handshake:</b> In Stage 1, an empty container is indexed. In Stage 2, the recipient inspects the case context "
        "(Case Number, Evidence Title, Jurisdiction) and issues an authorization token via <code>approveDocumentChange</code>. Only then "
        "can the provider's file upload transaction succeed.<br/>"
        "• <b>One-Time Authorization Token Consumption:</b> Line 24 explicitly resets <code>approvals[recipient][docId] = false</code>. "
        "This ensures that once an evidence file is registered, the provider cannot perform silent subsequent overwrites without obtaining fresh consent.<br/>"
        "• <b>Access Shielding:</b> Upon container initialization, <code>viewers[msg.sender][docId]</code> and <code>viewers[recipient][docId]</code> "
        "are granted atomic viewing capabilities while the rest of the world is blocked.",
        style_bullet
    ))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 3: ALGORITHM 2
    # =========================================================================
    story.append(Paragraph("3. Algorithm 2: Dispute Resolution, Force Update & Challenge Consensus", style_h1))
    story.append(Paragraph(
        "<b>Purpose:</b> Resolves post-validation evidentiary revisions and adversarial disputes. In real-world legal proceedings, "
        "forensic evidence may require updates (e.g. revised toxicological analysis or supplemental ballistics findings). "
        "Algorithm 2 prevents unilateral tampering by either party through an adversarial challenge mechanism arbitrated by "
        "an independent quorum of authorized validators.",
        style_body
    ))

    algo2_code = [
        "<font color='#38BDF8'><b>Algorithm 2:</b></font> Adversarial Challenge, Multi-Validator Arbitration & Anti-Deadlock Quorum",
        "<font color='#94A3B8'>1:</font> <b>procedure</b> <font color='#FACC15'>FORCE_UPDATE_DOCUMENT</font>(<i>docId</i>, <i>revisedIpfsHash</i>, <i>proofText</i>)",
        "<font color='#94A3B8'>2:</font>   <b>require</b> <i>msg.sender</i> == <i>documents</i>[<i>docId</i>].provider <b>and</b> !<i>documents</i>[<i>docId</i>].isRejected",
        "<font color='#94A3B8'>3:</font>   <b>if</b> <i>documents</i>[<i>docId</i>].isValid == true <b>then</b>",
        "<font color='#94A3B8'>4:</font>     <i>validDocuments</i>[<i>docId</i>] &larr; <i>documents</i>[<i>docId</i>]  <font color='#64748B'>// Preserves prior verified state</font>",
        "<font color='#94A3B8'>5:</font>   <b>end if</b>",
        "<font color='#94A3B8'>6:</font>   <i>disputeRounds</i>[<i>docId</i>] &larr; <i>disputeRounds</i>[<i>docId</i>] + 1  <font color='#64748B'>// Increment round to reset vote map</font>",
        "<font color='#94A3B8'>7:</font>   <i>validations</i>[<i>docId</i>] &larr; 0; <i>documents</i>[<i>docId</i>].isValid &larr; false",
        "<font color='#94A3B8'>8:</font>   <i>documents</i>[<i>docId</i>].isInChangePhase &larr; true; <i>documents</i>[<i>docId</i>].proof &larr; <i>proofText</i>",
        "<font color='#94A3B8'>9:</font>   <i>documents</i>[<i>docId</i>].ipfsHash &larr; <i>revisedIpfsHash</i>",
        "<font color='#94A3B8'>10:</font>  <b>emit</b> DocumentChallenge(<i>docId</i>, <i>revisedIpfsHash</i>, <i>proofText</i>, \"\")",
        "<font color='#94A3B8'>11:</font> <b>end procedure</b>",
        "<font color='#94A3B8'>12:</font>",
        "<font color='#94A3B8'>13:</font> <b>procedure</b> <font color='#FACC15'>CHALLENGE_DOCUMENT</font>(<i>docId</i>, <i>counterHash</i>, <i>witnessStatement</i>)",
        "<font color='#94A3B8'>14:</font>   <b>require</b> <i>msg.sender</i> == <i>documents</i>[<i>docId</i>].recipient <b>and</b> !<i>documents</i>[<i>docId</i>].isRejected",
        "<font color='#94A3B8'>15:</font>   <b>require</b> <i>documents</i>[<i>docId</i>].isInChangePhase == true",
        "<font color='#94A3B8'>16:</font>   <i>documents</i>[<i>docId</i>].ipfsHash &larr; <i>counterHash</i>; <i>documents</i>[<i>docId</i>].isInChangePhase &larr; false",
        "<font color='#94A3B8'>17:</font>   <b>emit</b> DocumentChallenge(<i>docId</i>, <i>counterHash</i>, <i>documents</i>[<i>docId</i>].proof, <i>witnessStatement</i>)",
        "<font color='#94A3B8'>18:</font> <b>end procedure</b>",
        "<font color='#94A3B8'>19:</font>",
        "<font color='#94A3B8'>20:</font> <b>procedure</b> <font color='#FACC15'>VALIDATE_FROM_VALIDATORS</font>(<i>docId</i>)",
        "<font color='#94A3B8'>21:</font>   <b>require</b> <i>validators</i>[<i>msg.sender</i>] == true <b>and</b> !<i>documents</i>[<i>docId</i>].isRejected",
        "<font color='#94A3B8'>22:</font>   <i>r</i> &larr; <i>disputeRounds</i>[<i>docId</i>]",
        "<font color='#94A3B8'>23:</font>   <b>require</b> <i>hasValidatedRound</i>[<i>docId</i>][<i>r</i>][<i>msg.sender</i>] == false  <font color='#64748B'>// Prevents double-voting in round</font>",
        "<font color='#94A3B8'>24:</font>   <i>hasValidatedRound</i>[<i>docId</i>][<i>r</i>][<i>msg.sender</i>] &larr; true; <i>validations</i>[<i>docId</i>] &larr; <i>validations</i>[<i>docId</i>] + 1",
        "<font color='#94A3B8'>25:</font>   <b>if</b> <i>validations</i>[<i>docId</i>] &ge; <i>validationLimit</i> <b>then</b>",
        "<font color='#94A3B8'>26:</font>     <i>documents</i>[<i>docId</i>].isValid &larr; true; <i>documents</i>[<i>docId</i>].isInChangePhase &larr; false",
        "<font color='#94A3B8'>27:</font>     <i>validDocuments</i>[<i>docId</i>] &larr; <i>documents</i>[<i>docId</i>]",
        "<font color='#94A3B8'>28:</font>     <b>emit</b> DocumentValidated(<i>docId</i>, <i>msg.sender</i>)",
        "<font color='#94A3B8'>29:</font>   <b>end if</b>",
        "<font color='#94A3B8'>30:</font> <b>end procedure</b>",
    ]
    story.append(make_algorithm_box(
        "2", "Force Update, Adversarial Challenge & Dispute Arbitration",
        {"time": "O(1) per vote", "gas": "~45,000 to ~95,000 gas per tx"},
        "docId, revisedIpfsHash, proofString, witnessStatement, validatorSignature",
        "Dispute round increment, updated isValid state, DocumentChallenge and DocumentValidated events",
        algo2_code
    ))

    story.append(Paragraph("<b>Mathematical Model of Dispute Rounds & Anti-Deadlock Guarantee:</b>", style_h3))
    story.append(Paragraph(
        "Let $R \\in \\mathbb{N}$ represent the dispute round sequence. In traditional multi-sig designs, if a validator votes "
        "in round $r$, an internal boolean mapping <code>hasValidated[val] = true</code> permanently locks that validator from voting again. "
        "If a case is contested multiple times, the system enters an unrecoverable deadlock. "
        "DocSafe overcomes this by parameterizing votes over a 3-dimensional tensor: "
        "<font face='Courier'>hasValidatedRound : DocID &times; Round &times; Validator &rarr; {0, 1}</font>. "
        "When a new dispute round is initiated ($r' = r + 1$), the previous round's votes are sealed in the historical audit trail, "
        "and a fresh consensus quorum threshold $k = \\text{validationLimit}$ is established with zero gas cleanup cost.",
        style_body
    ))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 4: ALGORITHM 3
    # =========================================================================
    story.append(Paragraph("4. Algorithm 3: MetaMask Web3 Cryptographic Signing & IPFS Binding", style_h1))
    story.append(Paragraph(
        "<b>Purpose:</b> Manages off-chain cryptographic digital signature generation via MetaMask and content-addressed storage "
        "on IPFS. Ensures non-repudiation of transactions while minimizing on-chain gas costs.",
        style_body
    ))

    algo3_code = [
        "<font color='#38BDF8'><b>Algorithm 3:</b></font> Client-Side ECDSA Signing and Off-Chain Decentralized Storage Binding",
        "<font color='#94A3B8'>1:</font> <b>procedure</b> <font color='#FACC15'>INGEST_AND_BIND_EVIDENCE</font>(<i>fileBytes</i>, <i>docId</i>, <i>signerAccount</i>)",
        "<font color='#94A3B8'>2:</font>   <i>H_local</i> &larr; <font color='#FACC15'>SHA256</font>(<i>fileBytes</i>)  <font color='#64748B'>// Client-side WebCrypto digest</font>",
        "<font color='#94A3B8'>3:</font>   <i>payload</i> &larr; { file: <i>fileBytes</i>, docId: <i>docId</i>, provider: <i>signerAccount</i> }",
        "<font color='#94A3B8'>4:</font>   <i>uploadRes</i> &larr; <b>POST</b> /upload(<i>payload</i>)",
        "<font color='#94A3B8'>5:</font>   <b>require</b> <i>uploadRes.sha256</i> == <i>H_local</i>  <font color='#64748B'>// Pre-upload integrity match</font>",
        "<font color='#94A3B8'>6:</font>   <i>CID</i> &larr; <i>uploadRes.ipfsHash</i>",
        "<font color='#94A3B8'>7:</font>   <i>txData</i> &larr; <font color='#FACC15'>encodeABI</font>(\"updateDocument\", [<i>docId</i>, <i>CID</i>, <i>H_local</i>])",
        "<font color='#94A3B8'>8:</font>   <i>txParams</i> &larr; { from: <i>signerAccount</i>, to: <i>CONTRACT_ADDRESS</i>, data: <i>txData</i> }",
        "<font color='#94A3B8'>9:</font>   <i>txHash</i> &larr; <font color='#FACC15'>eth_sendTransaction</font>(<i>txParams</i>) <b>via</b> MetaMask EIP-1193",
        "<font color='#94A3B8'>10:</font>  <i>receipt</i> &larr; <font color='#FACC15'>waitForTransactionReceipt</font>(<i>txHash</i>)",
        "<font color='#94A3B8'>11:</font>  <b>emit</b> OffChainRegistered(<i>docId</i>, <i>CID</i>, <i>H_local</i>, <i>receipt.blockNumber</i>)",
        "<font color='#94A3B8'>12:</font> <b>end procedure</b>",
    ]
    story.append(make_algorithm_box(
        "3", "MetaMask Web3 Transaction Signing & IPFS Off-Chain Binding",
        {"time": "O(N) file hash + O(1) tx", "gas": "~55,000 gas"},
        "fileBytes, docId, providerAddress, MetaMask Wallet",
        "IPFS Content Identifier (CID), on-chain transaction receipt, immutable ledger anchor",
        algo3_code
    ))

    story.append(Paragraph("<b>Cryptographic Primitive Rationale:</b>", style_h3))
    story.append(Paragraph(
        "• <b>Elliptic Curve Digital Signature Algorithm (ECDSA):</b> MetaMask signs transaction payloads with the secp256k1 curve "
        "($y^2 = x^3 + 7 \\pmod p$). The transaction hash $e$ and private key $d$ yield signature $(r, s, v)$. On-chain EVM "
        "executes <code>ecrecover</code> to cryptographically guarantee that the provider address matches <code>msg.sender</code>.<br/>"
        "• <b>Storage Cost Optimization:</b> Storing 1 MB of binary evidence directly on Ethereum at 20 gwei gas price costs upwards "
        "of $1,500. Storing the IPFS CID (32 to 64 bytes) alongside the 32-byte SHA-256 fingerprint costs under $0.05 while achieving "
        "equivalent mathematical immutability.",
        style_bullet
    ))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 5: ALGORITHM 4
    # =========================================================================
    story.append(Paragraph("5. Algorithm 4: Cryptographic Pre/Post Integrity Verification", style_h1))
    story.append(Paragraph(
        "<b>Purpose:</b> Implements zero-knowledge end-to-end evidence integrity auditing. A common vulnerability in naive blockchain systems "
        "is the 'Garbage-In, Garbage-Out' flaw, where an attacker alters file bytes during gateway transit or IPFS retrieval. "
        "Algorithm 4 guarantees dual-layer integrity verification at every hop of the evidentiary lifecycle.",
        style_body
    ))

    algo4_code = [
        "<font color='#38BDF8'><b>Algorithm 4:</b></font> Dual-Digest Verification (Client SHA-256 &plus; Gateway Proxy Stream Integrity)",
        "<font color='#94A3B8'>1:</font> <b>procedure</b> <font color='#FACC15'>VERIFY_EVIDENCE_INTEGRITY</font>(<i>fileBuffer</i>, <i>expectedSha256</i>)",
        "<font color='#94A3B8'>2:</font>   <i>computedDigest</i> &larr; <font color='#FACC15'>crypto.subtle.digest</font>(\"SHA-256\", <i>fileBuffer</i>)",
        "<font color='#94A3B8'>3:</font>   <i>computedHex</i> &larr; <font color='#FACC15'>toHexString</font>(<i>computedDigest</i>)",
        "<font color='#94A3B8'>4:</font>   <b>if</b> <i>computedHex</i> != <i>expectedSha256</i> <b>then</b>",
        "<font color='#94A3B8'>5:</font>     <font color='#EF4444'><b>raise IntegrityViolationError</b></font>(\"Cryptographic hash mismatch! Evidence may be tampered.\")",
        "<font color='#94A3B8'>6:</font>   <b>end if</b>",
        "<font color='#94A3B8'>7:</font>   <b>return</b> { verified: true, digest: <i>computedHex</i> }",
        "<font color='#94A3B8'>8:</font> <b>end procedure</b>",
        "<font color='#94A3B8'>9:</font>",
        "<font color='#94A3B8'>10:</font> <b>procedure</b> <font color='#FACC15'>GATEWAY_PROXY_FETCH</font>(<i>cid</i>)",
        "<font color='#94A3B8'>11:</font>  <i>rawStream</i> &larr; <b>GET</b> https://gateway.pinata.cloud/ipfs/<i>cid</i>",
        "<font color='#94A3B8'>12:</font>  <i>hasher</i> &larr; <font color='#FACC15'>createHash</font>(\"sha256\"); <i>chunks</i> &larr; []",
        "<font color='#94A3B8'>13:</font>  <b>for each</b> <i>chunk</i> <b>in</b> <i>rawStream</i> <b>do</b>: <i>hasher</i>.update(<i>chunk</i>); <i>chunks</i>.push(<i>chunk</i>)",
        "<font color='#94A3B8'>14:</font>  <i>streamSha256</i> &larr; <i>hasher</i>.digest(\"hex\")",
        "<font color='#94A3B8'>15:</font>  <b>setResponseHeader</b>(\"X-SHA256-Fingerprint\", <i>streamSha256</i>)",
        "<font color='#94A3B8'>16:</font>  <b>returnStream</b>(<i>chunks</i>)",
        "<font color='#94A3B8'>17:</font> <b>end procedure</b>",
    ]
    story.append(make_algorithm_box(
        "4", "Cryptographic Pre/Post Integrity Verification & Streaming Digest",
        {"time": "O(N) streaming linear", "gas": "Off-chain ($0 gas)"},
        "fileBuffer, expectedSha256, IPFS CID",
        "Integrity confirmation boolean, X-SHA256-Fingerprint HTTP header",
        algo4_code
    ))

    story.append(make_callout(
        "Forensic Admissibility Guarantee (Federal Rule of Evidence 902(13)/(14))",
        "By comparing the raw binary hash generated at ingest against the on-chain recorded fingerprint and the "
        "gateway stream digest, DocSafe satisfies the legal standard for Self-Authenticating Electronic Data.",
        "success"
    ))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 6: ALGORITHM 5
    # =========================================================================
    story.append(Paragraph("6. Algorithm 5: Evidence Rejection, Rollback & Linked Resubmission", style_h1))
    story.append(Paragraph(
        "<b>Purpose:</b> Implements formal evidentiary rejection and lineage-linked container resubmission. "
        "If submitted evidence is corrupted, illegible, or violates chain-of-custody protocols, reviewers reject it. "
        "Algorithm 5 closes the review round, freezes the defective container, and allows the original provider to spin up "
        "a linked replacement container without destroying historical audit evidence.",
        style_body
    ))

    algo5_code = [
        "<font color='#38BDF8'><b>Algorithm 5:</b></font> Formal Rejection, State Machine Freezing and Lineage Resubmission",
        "<font color='#94A3B8'>1:</font> <b>procedure</b> <font color='#FACC15'>REJECT_DOCUMENT</font>(<i>docId</i>, <i>reasonString</i>)",
        "<font color='#94A3B8'>2:</font>   <b>require</b> <i>msg.sender</i> == <i>documents</i>[<i>docId</i>].recipient <b>or</b> <i>validators</i>[<i>msg.sender</i>] <b>or</b> <i>msg.sender</i> == <i>owner</i>",
        "<font color='#94A3B8'>3:</font>   <b>require</b> <i>documents</i>[<i>docId</i>].isValid == false  <font color='#64748B'>// Cannot reject verified court evidence</font>",
        "<font color='#94A3B8'>4:</font>   <b>require</b> <i>documents</i>[<i>docId</i>].isRejected == false <font color='#64748B'>// Prevent redundant double-rejection</font>",
        "<font color='#94A3B8'>5:</font>   <i>documents</i>[<i>docId</i>].isRejected &larr; true",
        "<font color='#94A3B8'>6:</font>   <i>documents</i>[<i>docId</i>].rejectionReason &larr; <i>reasonString</i>",
        "<font color='#94A3B8'>7:</font>   <i>documents</i>[<i>docId</i>].isInChangePhase &larr; false",
        "<font color='#94A3B8'>8:</font>   <i>approvals</i>[<i>documents</i>[<i>docId</i>].recipient][<i>docId</i>] &larr; false <font color='#64748B'>// Revoke consent</font>",
        "<font color='#94A3B8'>9:</font>   <b>emit</b> DocumentRejected(<i>docId</i>, <i>msg.sender</i>, <i>reasonString</i>)",
        "<font color='#94A3B8'>10:</font> <b>end procedure</b>",
        "<font color='#94A3B8'>11:</font>",
        "<font color='#94A3B8'>12:</font> <b>procedure</b> <font color='#FACC15'>CREATE_RESUBMISSION</font>(<i>previousDocId</i>, <i>optionalRecipient</i>)",
        "<font color='#94A3B8'>13:</font>   <b>require</b> <i>documents</i>[<i>previousDocId</i>].provider == <i>msg.sender</i>",
        "<font color='#94A3B8'>14:</font>   <b>require</b> <i>documents</i>[<i>previousDocId</i>].isRejected == true  <font color='#64748B'>// Only rejected records can be resubmitted</font>",
        "<font color='#94A3B8'>15:</font>   <i>targetRec</i> &larr; (<i>optionalRecipient</i> != 0x0) ? <i>optionalRecipient</i> : <i>documents</i>[<i>previousDocId</i>].recipient",
        "<font color='#94A3B8'>16:</font>   <i>newDocId</i> &larr; <font color='#FACC15'>ADD_EMPTY_DOCUMENT</font>(<i>targetRec</i>)",
        "<font color='#94A3B8'>17:</font>   <b>emit</b> DocumentResubmitted(<i>newDocId</i>, <i>previousDocId</i>)",
        "<font color='#94A3B8'>18:</font>   <b>return</b> <i>newDocId</i>",
        "<font color='#94A3B8'>19:</font> <b>end procedure</b>",
    ]
    story.append(make_algorithm_box(
        "5", "Formal Rejection, State Freezing & Lineage Resubmission",
        {"time": "O(1)", "gas": "~35,000 to ~65,000 gas"},
        "docId, rejectionReason, previousDocId",
        "DocumentRejected event, DocumentResubmitted event, new linked container ID",
        algo5_code
    ))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 7: ALGORITHM 6
    # =========================================================================
    story.append(Paragraph("7. Algorithm 6: Dynamic Role-Based Access Control & Viewer Delegation", style_h1))
    story.append(Paragraph(
        "<b>Purpose:</b> Implements dynamic on-chain capability delegation. Evidentiary records often need to be inspected "
        "by third-party expert witnesses, judges, or defense attorneys without granting them permission to alter the evidence "
        "or approve changes. Algorithm 6 provides granular viewing delegation under the strict authority of the case recipient.",
        style_body
    ))

    algo6_code = [
        "<font color='#38BDF8'><b>Algorithm 6:</b></font> Recipient-Governed Dynamic Capability Delegation Matrix",
        "<font color='#94A3B8'>1:</font> <b>procedure</b> <font color='#FACC15'>APPROVE_VIEWER</font>(<i>docId</i>, <i>viewerAddress</i>)",
        "<font color='#94A3B8'>2:</font>   <b>require</b> <i>msg.sender</i> == <i>documents</i>[<i>docId</i>].recipient <b>and</b> <i>viewerAddress</i> != 0x0",
        "<font color='#94A3B8'>3:</font>   <i>viewers</i>[<i>viewerAddress</i>][<i>docId</i>] &larr; true",
        "<font color='#94A3B8'>4:</font>   <b>emit</b> ViewerApproved(<i>docId</i>, <i>viewerAddress</i>)",
        "<font color='#94A3B8'>5:</font> <b>end procedure</b>",
        "<font color='#94A3B8'>6:</font>",
        "<font color='#94A3B8'>7:</font> <b>procedure</b> <font color='#FACC15'>REVOKE_VIEWER</font>(<i>docId</i>, <i>viewerAddress</i>)",
        "<font color='#94A3B8'>8:</font>   <b>require</b> <i>msg.sender</i> == <i>documents</i>[<i>docId</i>].recipient",
        "<font color='#94A3B8'>9:</font>   <i>viewers</i>[<i>viewerAddress</i>][<i>docId</i>] &larr; false",
        "<font color='#94A3B8'>10:</font>  <b>emit</b> ViewerRevoked(<i>docId</i>, <i>viewerAddress</i>)",
        "<font color='#94A3B8'>11:</font> <b>end procedure</b>",
        "<font color='#94A3B8'>12:</font>",
        "<font color='#94A3B8'>13:</font> <b>function</b> <font color='#FACC15'>VIEW_DOCUMENT</font>(<i>docId</i>) <b>view returns</b> (string)",
        "<font color='#94A3B8'>14:</font>   <b>require</b> <i>viewers</i>[<i>msg.sender</i>][<i>docId</i>] == true, <font color='#EF4444'>\"Access denied: Not authorized\"</font>",
        "<font color='#94A3B8'>15:</font>   <b>return</b> <i>documents</i>[<i>docId</i>].ipfsHash",
        "<font color='#94A3B8'>16:</font> <b>end function</b>",
    ]
    story.append(make_algorithm_box(
        "6", "Dynamic Role-Based Access Control & Viewer Delegation",
        {"time": "O(1)", "gas": "~28,000 gas per grant/revoke"},
        "docId, viewerAddress",
        "ViewerApproved / ViewerRevoked events, access-gated IPFS CID string",
        algo6_code
    ))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 8: ALGORITHM 7
    # =========================================================================
    story.append(Paragraph("8. Algorithm 7: Chain-of-Custody Timeline Aggregation & Event Decoding", style_h1))
    story.append(Paragraph(
        "<b>Purpose:</b> Aggregates on-chain decoded event logs and relational SQLite audit records into a single, unified, "
        "chronological timeline of custody. This algorithm powers both the interactive visual timeline and the printable "
        "forensic custody certificate.",
        style_body
    ))

    algo7_code = [
        "<font color='#38BDF8'><b>Algorithm 7:</b></font> Hybrid On-Chain/Off-Chain Chain-of-Custody Reconciliation",
        "<font color='#94A3B8'>1:</font> <b>procedure</b> <font color='#FACC15'>FETCH_COMPLETE_AUDIT_TRAIL</font>(<i>docId</i>, <i>contractAddr</i>)",
        "<font color='#94A3B8'>2:</font>   <i>meta</i> &larr; <b>GET</b> /api/evidence/<i>docId</i>; <i>backendEvents</i> &larr; <b>GET</b> /api/evidence/<i>docId</i>/audit",
        "<font color='#94A3B8'>3:</font>   <i>rawLogs</i> &larr; <i>publicClient</i>.getLogs({ address: <i>contractAddr</i>, fromBlock: 0n, toBlock: 'latest' })",
        "<font color='#94A3B8'>4:</font>   <i>timeline</i> &larr; []",
        "<font color='#94A3B8'>5:</font>   <b>for each</b> <i>log</i> <b>in</b> <i>rawLogs</i> <b>do</b>",
        "<font color='#94A3B8'>6:</font>     <i>decoded</i> &larr; <font color='#FACC15'>decodeEventLog</font>({ abi: <i>ABI</i>, data: <i>log.data</i>, topics: <i>log.topics</i> })",
        "<font color='#94A3B8'>7:</font>     <b>if</b> <i>decoded.args.documentId</i> == <i>docId</i> <b>or</b> <i>decoded.args.newDocumentId</i> == <i>docId</i> <b>then</b>",
        "<font color='#94A3B8'>8:</font>       <i>block</i> &larr; <i>publicClient</i>.getBlock({ blockNumber: <i>log.blockNumber</i> })",
        "<font color='#94A3B8'>9:</font>       <i>timestamp</i> &larr; <font color='#FACC15'>formatISO</font>(<i>block.timestamp</i>)",
        "<font color='#94A3B8'>10:</font>      <i>timeline</i>.push(<font color='#FACC15'>formatContractEvent</font>(<i>decoded.name</i>, <i>decoded.args</i>, <i>log.txHash</i>, <i>timestamp</i>))",
        "<font color='#94A3B8'>11:</font>    <b>end if</b>",
        "<font color='#94A3B8'>12:</font>  <b>end for</b>",
        "<font color='#94A3B8'>13:</font>  <b>for each</b> <i>be</i> <b>in</b> <i>backendEvents</i> <b>do</b>: <i>timeline</i>.push(<font color='#FACC15'>formatBackendEvent</font>(<i>be</i>))",
        "<font color='#94A3B8'>14:</font>  <i>timeline</i>.sort(<b>by</b> timestamp <b>ascending</b>)",
        "<font color='#94A3B8'>15:</font>  <b>return</b> { metadata: <i>meta</i>, timeline: <i>timeline</i> }",
        "<font color='#94A3B8'>16:</font> <b>end procedure</b>",
    ]
    story.append(make_algorithm_box(
        "7", "Chain-of-Custody Timeline Aggregation & Forensic Event Decoding",
        {"time": "O(L log L) sorting L logs", "gas": "Off-chain ($0 gas)"},
        "docId, contractAddress, publicClient instance",
        "Chronologically unified audit timeline array, court-admissible certificate payload",
        algo7_code
    ))
    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 9: ALGORITHM COMPARISON MATRIX
    # =========================================================================
    story.append(Paragraph("9. Algorithmic Comparison & Operational Matrix", style_h1))
    story.append(Paragraph(
        "The following matrix summarizes the technical attributes, complexity, participant actors, and execution domains "
        "of all seven core algorithms implemented across the DocSafe system:",
        style_body
    ))

    matrix_data = [
        [
            Paragraph("<b>Algo #</b>", style_th),
            Paragraph("<b>Name & Function</b>", style_th),
            Paragraph("<b>Execution Domain</b>", style_th),
            Paragraph("<b>Primary Actors</b>", style_th),
            Paragraph("<b>Time Complexity</b>", style_th),
            Paragraph("<b>Gas Profile</b>", style_th),
        ],
        [
            Paragraph("<b>Algo 1</b>", style_td),
            Paragraph("Evidence Ingestion & Consent", style_td),
            Paragraph("Ethereum Smart Contract", style_td),
            Paragraph("Provider, Recipient", style_td),
            Paragraph("O(1) constant", style_td),
            Paragraph("~85k - 120k gas", style_td),
        ],
        [
            Paragraph("<b>Algo 2</b>", style_td),
            Paragraph("Force Update & Challenge Flow", style_td),
            Paragraph("Ethereum Smart Contract", style_td),
            Paragraph("Provider, Recipient, Validators", style_td),
            Paragraph("O(1) per vote", style_td),
            Paragraph("~45k - 95k gas", style_td),
        ],
        [
            Paragraph("<b>Algo 3</b>", style_td),
            Paragraph("MetaMask Signing & IPFS Binding", style_td),
            Paragraph("Client + IPFS Gateway", style_td),
            Paragraph("Provider, MetaMask, IPFS", style_td),
            Paragraph("O(N) data upload", style_td),
            Paragraph("~55k gas anchor", style_td),
        ],
        [
            Paragraph("<b>Algo 4</b>", style_td),
            Paragraph("Dual-Digest Integrity Verification", style_td),
            Paragraph("Client WebCrypto + Express", style_td),
            Paragraph("Browser Client, API Server", style_td),
            Paragraph("O(N) streaming hash", style_td),
            Paragraph("Off-chain ($0 gas)", style_td),
        ],
        [
            Paragraph("<b>Algo 5</b>", style_td),
            Paragraph("Rejection & Lineage Resubmission", style_td),
            Paragraph("Ethereum Smart Contract", style_td),
            Paragraph("Recipient, Validator, Provider", style_td),
            Paragraph("O(1) constant", style_td),
            Paragraph("~35k - 65k gas", style_td),
        ],
        [
            Paragraph("<b>Algo 6</b>", style_td),
            Paragraph("Dynamic RBAC Viewer Delegation", style_td),
            Paragraph("Ethereum Smart Contract", style_td),
            Paragraph("Recipient, 3rd-Party Viewers", style_td),
            Paragraph("O(1) lookup/grant", style_td),
            Paragraph("~28k gas per grant", style_td),
        ],
        [
            Paragraph("<b>Algo 7</b>", style_td),
            Paragraph("Chain-of-Custody Timeline Aggregation", style_td),
            Paragraph("Client Viem RPC + SQLite", style_td),
            Paragraph("Auditors, Legal Counsel, Court", style_td),
            Paragraph("O(L log L) sort", style_td),
            Paragraph("Off-chain ($0 gas)", style_td),
        ],
    ]

    t_matrix = Table(matrix_data, colWidths=[40, 115, 95, 95, 75, 84])
    t_matrix.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('BOX', (0,0), (-1,-1), 1, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_matrix)
    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 10: REFERENCES & CITATIONS
    # =========================================================================
    story.append(Paragraph("10. Academic References & Project Citations", style_h1))
    story.append(Paragraph(
        "The algorithmic formulations implemented in this project are substantiated by the research literature referenced "
        "in the DocSafe research paper drafts:",
        style_body
    ))

    citations = [
        "[1] S. Bonomi, M. Casini, and C. Ciccotelli, \"B-CoC: A blockchain-based chain of custody for evidences management in digital forensics,\" arXiv:1807.10359, 2018.",
        "[2] S. H. Gopalan, S. A. Suba, C. Ashmithashree, A. Gayathri, and V. J. Andrews, \"Digital forensics using blockchain,\" Int. J. Recent Technol. Eng., vol. 8, pp. 182–184, 2019.",
        "[3] J. Bou Abdo, R. El Sibai, and J. Demerjian, \"Permissionless proof-of-reputation-X: A hybrid reputation-based consensus algorithm,\" Trans. Emerg. Telecommun. Technol., vol. 32, p. e4148, 2021.",
        "[4] T. Varshney, N. Sharma, I. Kaushik, and B. Bhushan, \"Authentication and encryption based security services in blockchain technology,\" in Proc. IEEE ICCCIS, 2019, pp. 63–68.",
        "[5] National Institute of Standards and Technology (NIST), \"Blockchain Technology Overview,\" NIST IR 8202, Oct. 2018. doi: 10.6028/NIST.IR.8202.",
        "[6] E. Androulaki et al., \"Hyperledger Fabric: A distributed operating system for permissioned blockchains,\" in Proc. Thirteenth EuroSys Conf. (EuroSys '18), 2018, Art. 30."
    ]
    for c in citations:
        story.append(Paragraph(c, style_bullet))

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] PDF generated successfully: {filename}")

if __name__ == "__main__":
    out_pdf = "DocSafe_Algorithms_and_Technical_Explanation.pdf"
    if len(sys.argv) > 1:
        out_pdf = sys.argv[1]
    build_pdf(out_pdf)
