"""Report Service — Research paper and report generation."""

import asyncio
import io
import re
import html
from typing import Optional, List, Dict, Any
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
from reportlab.pdfgen import canvas

from app.database import supabase
from app.schemas import ReportRequest


class NumberedCanvas(canvas.Canvas):
    """Canvas class to generate custom footers with page numbers ('Page X of Y') and headers."""
    
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Draw diagonal watermark on all pages behind the text
        self.saveState()
        self.setFont("Helvetica-Bold", 55)
        self.setFillColor(colors.HexColor("#F1F5F9"))  # Slate 100 (subtle background color)
        self.translate(306, 396)
        self.rotate(45)
        self.drawCentredString(0, 0, "AERO VISION")
        self.restoreState()
        
        # Draw decorations only on pages after page 1 (cover header is fine on page 1)
        if self._pageNumber > 1:
            # Header text
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#4F46E5"))  # Indigo
            self.drawString(54, 750, "INDIA AEROVISION GEOSPATIAL NETWORK")
            
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#6B7280"))  # Gray-500
            self.drawRightString(612 - 54, 750, "SCIENTIFIC & POLICY DATA PORTAL")
            
            # Header Line
            self.setStrokeColor(colors.HexColor("#E5E7EB"))  # Gray-200
            self.setLineWidth(0.75)
            self.line(54, 742, 612 - 54, 742)
            
            # Footer Line
            self.line(54, 48, 612 - 54, 48)
            
            # Footer
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#6B7280"))
            self.drawString(54, 36, "Confidential - For Academic & Policy Decisions Only")
            
            page_text = f"Page {self._pageNumber} of {page_count}"
            self.drawRightString(612 - 54, 36, page_text)
            
        self.restoreState()


def md_to_reportlab_html(text: str) -> str:
    """Converts basic markdown tags to ReportLab supported HTML-like tags."""
    if not text:
        return ""
    # Escape HTML entities first to avoid parsing errors
    text = html.escape(text)
    
    # Restore basic characters escaped by html.escape that are safe for rendering
    text = text.replace("&amp;lt;", "&lt;").replace("&amp;gt;", "&gt;")
    text = text.replace("&amp;amp;", "&amp;")
    
    # Bold: **text** -> <b>text</b>
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    # Italic: *text* -> <i>text</i>
    text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
    # Monospace: `text` -> <font face="Courier">\1</font>
    text = re.sub(r'`(.*?)`', r'<font face="Courier" size="8.5" color="#4B5563">\1</font>', text)
    
    return text


def parse_markdown_to_flowables(text: str, styles) -> list:
    """Parses a markdown section into a list of ReportLab Flowables."""
    flowables = []
    lines = text.split("\n")
    in_list = False
    list_items = []
    
    for line in lines:
        line = line.strip()
        if not line:
            if in_list:
                for item in list_items:
                    flowables.append(Paragraph(f"• {item}", styles["BodyList"]))
                    flowables.append(Spacer(1, 3))
                list_items = []
                in_list = False
            continue
            
        # Match headers
        if line.startswith("###"):
            header_text = line.replace("###", "").strip()
            flowables.append(Spacer(1, 8))
            flowables.append(Paragraph(md_to_reportlab_html(header_text), styles["ReportHeading3"]))
            flowables.append(Spacer(1, 4))
        elif line.startswith("##"):
            header_text = line.replace("##", "").strip()
            flowables.append(Spacer(1, 12))
            flowables.append(Paragraph(md_to_reportlab_html(header_text), styles["ReportHeading2"]))
            flowables.append(Spacer(1, 6))
        elif line.startswith("#"):
            header_text = line.replace("#", "").strip()
            flowables.append(Spacer(1, 16))
            flowables.append(Paragraph(md_to_reportlab_html(header_text), styles["ReportHeading1"]))
            flowables.append(Spacer(1, 8))
        # Match list items
        elif line.startswith("- ") or line.startswith("* "):
            in_list = True
            item_text = line[2:].strip()
            list_items.append(md_to_reportlab_html(item_text))
        elif re.match(r'^\d+\.\s', line):
            in_list = True
            item_text = re.sub(r'^\d+\.\s', '', line).strip()
            list_items.append(md_to_reportlab_html(item_text))
        else:
            if in_list:
                for item in list_items:
                    flowables.append(Paragraph(f"• {item}", styles["BodyList"]))
                    flowables.append(Spacer(1, 3))
                list_items = []
                in_list = False
            
            # Normal paragraph text
            flowables.append(Paragraph(md_to_reportlab_html(line), styles["ReportBody"]))
            flowables.append(Spacer(1, 8))
            
    if in_list:
        for item in list_items:
            flowables.append(Paragraph(f"• {item}", styles["BodyList"]))
            flowables.append(Spacer(1, 3))
            
    return flowables


class ReportService:
    """Service for generating research reports and PDF documents."""

    async def list_reports(
        self,
        report_type: Optional[str] = None,
        search: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict]:
        """Lists generated reports with optional query filters."""
        query = supabase.table("reports").select("*")
        if report_type:
            query = query.eq("report_type", report_type)
        if search:
            query = query.ilike("title", f"%{search}%")
        if start_date:
            query = query.gte("generated_at", start_date)
        if end_date:
            query = query.lte("generated_at", end_date)
            
        result = await asyncio.to_thread(query.order("generated_at", desc=True).limit(limit).execute)
        return result.data or []

    async def _gather_db_context(self) -> str:
        """Gathers recent environmental statistics from the database to contextualize report synthesis."""
        context_parts = []
        
        # 1. AQI Observations
        try:
            query = supabase.table("cpcb_observations").select("aqi, city, state").order("observed_at", desc=True).limit(100)
            aqi_data = (await asyncio.to_thread(query.execute)).data or []
            if aqi_data:
                aqis = [r["aqi"] for r in aqi_data if r.get("aqi") is not None]
                if aqis:
                    avg_aqi = sum(aqis) / len(aqis)
                    max_aqi = max(aqis)
                    cities = [r["city"] for r in aqi_data if r.get("city")]
                    unique_cities = list(set(cities))
                    context_parts.append(
                        f"Air Quality Index (AQI) Observations (last 100 observations):\n"
                        f"- Average AQI: {avg_aqi:.1f}\n"
                        f"- Maximum AQI: {max_aqi}\n"
                        f"- Active Reporting Cities: {len(unique_cities)} (e.g., {', '.join(unique_cities[:5])})\n"
                    )
        except Exception as e:
            context_parts.append(f"AQI Stats: Not available ({str(e)})\n")
            
        # 2. Fire Records
        try:
            query = supabase.table("fire_records").select("frp, state").order("detected_at", desc=True).limit(100)
            fire_data = (await asyncio.to_thread(query.execute)).data or []
            if fire_data:
                frps = [r["frp"] for r in fire_data if r.get("frp") is not None]
                states = [r["state"] for r in fire_data if r.get("state")]
                unique_states = list(set(states))
                avg_frp = sum(frps) / len(frps) if frps else 0.0
                context_parts.append(
                    f"Active Thermal Anomalies (last 100 MODIS/VIIRS detections):\n"
                    f"- Fire Event Count: {len(fire_data)}\n"
                    f"- Average Fire Radiative Power (FRP): {avg_frp:.1f} MW\n"
                    f"- Active Burning States: {', '.join(unique_states[:5]) if unique_states else 'None'}\n"
                )
        except Exception as e:
            context_parts.append(f"Fire Stats: Not available ({str(e)})\n")

        # 3. TROPOMI HCHO Products
        try:
            query = supabase.table("tropomi_products").select("column_value").eq("product_type", "HCHO").order("observed_date", desc=True).limit(100)
            hcho_data = (await asyncio.to_thread(query.execute)).data or []
            if hcho_data:
                hcho_vals = [r["column_value"] for r in hcho_data if r.get("column_value") is not None]
                if hcho_vals:
                    avg_hcho = sum(hcho_vals) / len(hcho_vals)
                    max_hcho = max(hcho_vals)
                    context_parts.append(
                        f"TROPOMI Formaldehyde (HCHO) Satellite Retrievals (last 100 observations):\n"
                        f"- Average HCHO Column Density: {avg_hcho:.3e} mol/m²\n"
                        f"- Maximum HCHO Column Density: {max_hcho:.3e} mol/m²\n"
                    )
        except Exception as e:
            context_parts.append(f"HCHO Stats: Not available ({str(e)})\n")

        # 4. Model Metadata & Evaluator
        try:
            query = supabase.table("model_metadata").select("model_name, target_variable, rmse, r_squared").eq("is_active", True)
            models_data = (await asyncio.to_thread(query.execute)).data or []
            if models_data:
                context_parts.append("Active Atmospheric Predictive Models:\n")
                for m in models_data:
                    context_parts.append(
                        f"- Model: {m['model_name']} (predicting {m['target_variable']})\n"
                        f"  - RMSE: {m['rmse']:.3f}\n"
                        f"  - R² Score: {m['r_squared']:.3f}\n"
                    )
        except Exception as e:
            context_parts.append(f"Model Stats: Not available ({str(e)})\n")
            
        return "\n".join(context_parts)

    async def generate_report(self, request: ReportRequest) -> Dict:
        """Generate a structured research report with integrated database metrics."""
        content = {}
        
        # Gather real environmental context from database
        db_context = await self._gather_db_context()

        # Run section compilations using Gemini (or fallback locally if key missing / quota error)
        if "abstract" in request.include_sections:
            content["abstract"] = await self._generate_real_ai_section("abstract", db_context, request.title, request.report_type)
        if "introduction" in request.include_sections:
            content["introduction"] = await self._generate_real_ai_section("introduction", db_context, request.title, request.report_type)
        if "methodology" in request.include_sections:
            content["methodology"] = await self._generate_real_ai_section("methodology", db_context, request.title, request.report_type)
        if "datasets" in request.include_sections:
            content["datasets"] = await self._generate_real_ai_section("datasets", db_context, request.title, request.report_type)
        if "results" in request.include_sections:
            content["results"] = await self._generate_real_ai_section("results", db_context, request.title, request.report_type)
        if "discussion" in request.include_sections:
            content["discussion"] = await self._generate_real_ai_section("discussion", db_context, request.title, request.report_type)
        if "conclusion" in request.include_sections:
            content["conclusion"] = await self._generate_real_ai_section("conclusion", db_context, request.title, request.report_type)
        if "references" in request.include_sections:
            content["references"] = await self._generate_real_ai_section("references", db_context, request.title, request.report_type)

        # Store report metadata and parsed contents
        report_data = {
            "report_type": request.report_type,
            "title": request.title,
            "abstract": content.get("abstract", ""),
            "content": content,
            "status": "generated",
        }
        result = await asyncio.to_thread(supabase.table("reports").insert(report_data).execute)
        return result.data[0] if result.data else report_data

    async def get_report(self, report_id: int) -> Dict:
        """Retrieves a single report from database by ID."""
        result = await asyncio.to_thread(supabase.table("reports").select("*").eq("id", report_id).single().execute)
        return result.data if result.data else {}

    async def download_report(self, report_id: int) -> Dict:
        """Returns standard download status and schema configuration (kept for backward compatibility)."""
        report = await self.get_report(report_id)
        return {"report_id": report_id, "pdf_path": report.get("pdf_path"), "status": report.get("status")}

    async def download_report_pdf(self, report_id: int) -> Optional[io.BytesIO]:
        """Compiles the database report sections into a beautifully typeset binary PDF file using ReportLab."""
        report = await self.get_report(report_id)
        if not report:
            return None
            
        buffer = io.BytesIO()
        # Setup page template: 0.75 margin is 54 points. letter is 612x792.
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=54,
            rightMargin=54,
            topMargin=72,
            bottomMargin=72
        )
        
        styles = getSampleStyleSheet()
        
        # Typography configurations
        h1_style = ParagraphStyle(
            'ReportHeading1',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#1E1B4B"),  # Deep Purple
            spaceBefore=14,
            spaceAfter=8,
            keepWithNext=True
        )
        h2_style = ParagraphStyle(
            'ReportHeading2',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#4F46E5"),  # Indigo
            spaceBefore=12,
            spaceAfter=6,
            keepWithNext=True
        )
        h3_style = ParagraphStyle(
            'ReportHeading3',
            parent=styles['Heading3'],
            fontName='Helvetica-Bold',
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor("#4B5563"),
            spaceBefore=10,
            spaceAfter=4,
            keepWithNext=True
        )
        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['BodyText'],
            fontName='Times-Roman',
            fontSize=10,
            leading=14.5,
            textColor=colors.HexColor("#1F2937"),
            alignment=TA_JUSTIFY,
            spaceAfter=6
        )
        list_style = ParagraphStyle(
            'BodyList',
            parent=styles['BodyText'],
            fontName='Times-Roman',
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor("#1F2937"),
            leftIndent=15,
            spaceAfter=3
        )
        abstract_style = ParagraphStyle(
            'ReportAbstract',
            parent=styles['BodyText'],
            fontName='Times-Italic',
            fontSize=9,
            leading=13.5,
            textColor=colors.HexColor("#374151"),
            alignment=TA_JUSTIFY
        )
        
        styles.add(h1_style)
        styles.add(h2_style)
        styles.add(h3_style)
        styles.add(body_style)
        styles.add(list_style)
        styles.add(abstract_style)
        
        story = []
        
        # 1. Document Title Cover Header
        type_str = report.get("report_type", "research_paper").replace("_", " ").upper()
        title_str = report.get("title", "AeroVision Environmental Report")
        date_val = report.get("generated_at") or report.get("created_at") or datetime.now().isoformat()
        
        try:
            dt = datetime.fromisoformat(date_val.replace("Z", "+00:00"))
            formatted_date = dt.strftime("%B %d, %Y")
        except Exception:
            formatted_date = str(date_val)[:10]
            
        type_p = Paragraph(f"<font color='#4F46E5'><b>{type_str}</b></font>", ParagraphStyle('TypeP', fontName='Helvetica-Bold', fontSize=10, spaceAfter=8))
        story.append(type_p)
        
        title_p = Paragraph(title_str, ParagraphStyle('TitleP', fontName='Helvetica-Bold', fontSize=20, leading=24, textColor=colors.HexColor("#111827"), spaceAfter=10))
        story.append(title_p)
        
        meta_html = (
            f"<b>Author:</b> India AeroVision Geospatial Network<br/>"
            f"<b>Date:</b> {formatted_date}<br/>"
            f"<b>Affiliation:</b> Space Applications Centre (ISRO) &amp; Central Pollution Control Board (CPCB)"
        )
        meta_p = Paragraph(meta_html, ParagraphStyle('MetaP', fontName='Helvetica', fontSize=8.5, leading=13, textColor=colors.HexColor("#6B7280"), spaceAfter=15))
        story.append(meta_p)
        
        # Line separator
        line_table = Table([[""]], colWidths=[612 - 108])
        line_table.setStyle(TableStyle([
            ('LINEBELOW', (0,0), (-1,-1), 1.5, colors.HexColor("#4F46E5")),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(line_table)
        story.append(Spacer(1, 15))
        
        # 2. Abstract Callout Box
        abstract_text = report.get("abstract", "")
        if abstract_text:
            abs_p = Paragraph(f"<b>ABSTRACT:</b> {abstract_text}", abstract_style)
            abs_table = Table([[abs_p]], colWidths=[612 - 108])
            abs_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F9FAFB")),  # slate-50
                ('LINELEFT', (0,0), (0,-1), 3, colors.HexColor("#4F46E5")),
                ('TOPPADDING', (0,0), (-1,-1), 10),
                ('BOTTOMPADDING', (0,0), (-1,-1), 10),
                ('LEFTPADDING', (0,0), (-1,-1), 12),
                ('RIGHTPADDING', (0,0), (-1,-1), 12),
            ]))
            story.append(abs_table)
            story.append(Spacer(1, 15))
            
        # 3. Document Sections Flowables
        content = report.get("content", {})
        sections_order = ["introduction", "methodology", "datasets", "results", "discussion", "conclusion", "references"]
        
        for idx, sec in enumerate(sections_order, 1):
            sec_text = content.get(sec)
            if not sec_text:
                continue
                
            sec_name = sec.replace("_", " ").upper()
            sec_title = f"{idx}. {sec_name}"
            
            heading_p = Paragraph(sec_title, h1_style)
            story.append(KeepTogether([heading_p, Spacer(1, 4)]))
            
            sec_flowables = parse_markdown_to_flowables(sec_text, styles)
            for f in sec_flowables:
                story.append(f)
                
            story.append(Spacer(1, 12))
            
        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer

    async def _generate_real_ai_section(self, section: str, db_context: str, title: str, report_type: str) -> str:
        """Attempts NVIDIA NIM + Gemini dual-AI generation, single-provider generation, or falls back to database-driven templates on error."""
        from app.config import get_settings
        settings = get_settings()
        
        api_key = settings.NVIDIA_API_KEY
        is_nvidia_active = api_key and "placeholder" not in api_key.lower()
        is_gemini_active = settings.GEMINI_API_KEY and "placeholder" not in settings.GEMINI_API_KEY.lower()
        
        full_prompt = (
            f"You are a Senior Atmospheric Research Scientist at ISRO and CPCB.\n"
            f"You are co-authoring a formal scientific paper/report titled: '{title}'.\n"
            f"Document Type: {report_type.replace('_', ' ').upper()}.\n\n"
            f"Here is the real environmental geospatial data and observations from our AeroVision database:\n"
            f"{db_context}\n\n"
            f"Please write a comprehensive, highly rigorous, and peer-reviewed style content for the section: {section.upper()}.\n"
            f"Guidelines:\n"
            f"- Use precise scientific terminology (e.g., column density, tropospheric boundary layer, advection-diffusion, radiative forcing, Pearson correlation).\n"
            f"- Refer to the provided database statistics (like average AQI, peak values, fire detections, and model performance scores) to make the text realistic and grounded in observations.\n"
            f"- Do not use generic placeholders. Write real sentences and insert LaTeX-style math symbols if relevant (e.g. \\sigma, R^2, \\mu g/m^3).\n"
            f"- Format in clean Markdown. Avoid outputting the section title (we will insert it ourselves).\n"
            f"- Write only the body of this section. Be detailed, authoritative, and scientific."
        )

        # Scenario A: Dual-AI Orchestration (NVIDIA LLaMA 3.1 NIM draft + Google Gemini AI editing/peer-review)
        if is_nvidia_active and is_gemini_active:
            try:
                import httpx
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
                nvidia_draft = ""
                async with httpx.AsyncClient() as client:
                    resp = await client.post(
                        "https://integrate.api.nvidia.com/v1/chat/completions",
                        headers=headers,
                        json={
                            "model": "meta/llama-3.1-70b-instruct",
                            "messages": [
                                {"role": "system", "content": "You are a professional atmospheric scientist and co-author."},
                                {"role": "user", "content": full_prompt}
                            ],
                            "temperature": 0.2,
                            "max_tokens": 1200
                        },
                        timeout=45.0
                    )
                    if resp.status_code == 200:
                        nvidia_draft = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                        print(f"Successfully generated section '{section}' draft using NVIDIA LLaMA 3.1 NIM.")
                
                if nvidia_draft:
                    from google import genai
                    client = genai.Client(api_key=settings.GEMINI_API_KEY)
                    refinement_prompt = (
                        f"You are a Senior Atmospheric Research Scientist co-authoring the section: {section.upper()} "
                        f"for the paper/report: '{title}' ({report_type.replace('_', ' ').upper()}).\n\n"
                        f"Here is a draft written by your co-author (NVIDIA NIM):\n"
                        f"\"\"\"\n{nvidia_draft}\n\"\"\"\n\n"
                        f"Here is the database context they referenced:\n"
                        f"\"\"\"\n{db_context}\n\"\"\"\n\n"
                        f"Please review, refine, and polish this draft to make it highly academic, professional, and rigorous. "
                        f"Improve syntax, verify that all scientific terminology is appropriate, ensure LaTeX mathematical symbols "
                        f"(like \\sigma, R^2, \\mu g/m^3) are used correctly, and format in clean Markdown. "
                        f"Do not write any introductory or conversational text. Output only the refined body of the section."
                    )
                    
                    response = await asyncio.to_thread(
                        client.models.generate_content,
                        model='gemini-2.5-flash',
                        contents=refinement_prompt,
                    )
                    refined_text = response.text.strip()
                    print(f"Successfully refined section '{section}' using Google Gemini AI.")
                    return refined_text
            except Exception as e:
                print(f"Dual-AI report section generation failed: {repr(e)}. Falling back to single-provider workflow.")

        # Scenario B: Single-Provider NVIDIA LLaMA 3.1 NIM
        if is_nvidia_active:
            try:
                import httpx
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
                async with httpx.AsyncClient() as client:
                    resp = await client.post(
                        "https://integrate.api.nvidia.com/v1/chat/completions",
                        headers=headers,
                        json={
                            "model": "meta/llama-3.1-70b-instruct",
                            "messages": [
                                {"role": "system", "content": "You are a professional atmospheric scientist and co-author."},
                                {"role": "user", "content": full_prompt}
                            ],
                            "temperature": 0.2,
                            "max_tokens": 1200
                        },
                        timeout=45.0
                    )
                    if resp.status_code == 200:
                        text = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                        print(f"Successfully generated section '{section}' using NVIDIA LLaMA 3.1 NIM.")
                        return text
                    else:
                        print(f"NVIDIA NIM section generation status {resp.status_code}. Trying Gemini...")
            except Exception as e:
                print(f"NVIDIA NIM section generation error: {repr(e)}. Trying Gemini...")

        # Scenario C: Single-Provider Google Gemini AI
        if is_gemini_active:
            try:
                from google import genai
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model='gemini-2.5-flash',
                    contents=full_prompt,
                )
                return response.text
            except Exception as e:
                print(f"Gemini generation error for {section}: {str(e)}.")
                return f"Error generating section {section} using AI: {str(e)}"
        else:
            return f"Error generating section {section}: No AI API keys are configured."



