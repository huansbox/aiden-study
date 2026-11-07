"""Build concept/toy-question PDFs without private papers."""
import argparse, hashlib, json, os
from pathlib import Path
from xml.sax.saxutils import escape
import reportlab
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
SOURCE=Path(__file__).resolve().parent
OUTPUT=SOURCE.parent.parent/'output'/'pdf'
INPUTS=['content.json','toy-reference.json','build-pdf.py']
W,H=A4
MARGIN,SPLIT,BOTTOM=35,193,52
BODY_WIDTH=W-MARGIN-SPLIT-10
INK=colors.HexColor('#1c3040'); MUTED=colors.HexColor('#52616c')
LINE=colors.HexColor('#cbd4da'); PALE=colors.HexColor('#eaf0f3')
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def source_sha(name): return hashlib.sha256((SOURCE/name).read_text(encoding='utf-8').encode('utf-8')).hexdigest()
def paragraph(text,style): return Paragraph(escape(text).replace('\n','<br/>'),style)

def figure_geometry(fig,rid):
    """Validate top-down drawing bounds, including font-metric text extents."""
    assert fig['kind']=='vector',rid
    width,height=fig['width'],fig['height']
    assert 0<width<=BODY_WIDTH and 0<height<=450,(rid,width,height)
    bounds=[]
    for s in fig['shapes']:
        kind=s['type']
        if kind=='line': b=[min(s['x1'],s['x2']),min(s['y1'],s['y2']),max(s['x1'],s['x2']),max(s['y1'],s['y2'])]
        elif kind=='rect': b=[s['x'],s['y'],s['x']+s['width'],s['y']+s['height']]
        elif kind=='circle': b=[s['cx']-s['r'],s['cy']-s['r'],s['cx']+s['r'],s['cy']+s['r']]
        elif kind=='polygon': b=[min(p[0] for p in s['points']),min(p[1] for p in s['points']),max(p[0] for p in s['points']),max(p[1] for p in s['points'])]
        elif kind=='text':
            size=s.get('size',11); assert size>=9.5,(rid,'small label',size)
            font='TCBold' if s.get('bold') else 'TC'
            tw=pdfmetrics.stringWidth(s['text'],font,size)
            anchor=s.get('anchor','start'); assert anchor in ['start','middle','end']
            left=s['x']-(tw/2 if anchor=='middle' else tw if anchor=='end' else 0)
            ascent,descent=pdfmetrics.getAscentDescent(font,size)
            b=[left,s['y']-ascent,left+tw,s['y']-descent]
        else: raise ValueError(f'Unknown shape {kind} in {rid}')
        assert b[0]>=-.1 and b[1]>=-.1 and b[2]<=width+.1 and b[3]<=height+.1,(rid,kind,s.get('text'),b,width,height)
        bounds.append({'type':kind,'text':s.get('text'),'bounds':[round(v,2) for v in b]})
    return bounds

def draw_figure(c,fig,x,top):
    c.saveState()
    for s in fig['shapes']:
        c.setStrokeColor(colors.HexColor(s.get('stroke','#1c3040')))
        c.setLineWidth(s.get('strokeWidth',s.get('lineWidth',1)))
        c.setDash(s.get('dash',[]))
        fill=s.get('fill'); filled=bool(fill and fill!='none')
        c.setFillColor(colors.HexColor(fill) if filled else colors.white)
        k=s['type']
        if k=='line': c.line(x+s['x1'],top-s['y1'],x+s['x2'],top-s['y2'])
        elif k=='rect': c.rect(x+s['x'],top-s['y']-s['height'],s['width'],s['height'],stroke=1,fill=int(filled))
        elif k=='circle': c.circle(x+s['cx'],top-s['cy'],s['r'],stroke=1,fill=int(filled))
        elif k=='polygon':
            p=c.beginPath(); p.moveTo(x+s['points'][0][0],top-s['points'][0][1])
            for px,py in s['points'][1:]: p.lineTo(x+px,top-py)
            p.close(); c.drawPath(p,stroke=1,fill=int(filled))
        elif k=='text':
            c.setFont('TCBold' if s.get('bold') else 'TC',s.get('size',11))
            c.setFillColor(colors.HexColor(s.get('fill','#1c3040')))
            draw={'start':c.drawString,'middle':c.drawCentredString,'end':c.drawRightString}[s.get('anchor','start')]
            draw(x+s['x'],top-s['y'],s['text'])
    c.restoreState()

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--font',default=os.environ.get('PARENT_GUIDE_FONT','C:/Windows/Fonts/msjh.ttc'))
    p.add_argument('--bold-font',default=os.environ.get('PARENT_GUIDE_BOLD_FONT','C:/Windows/Fonts/msjhbd.ttc'))
    p.add_argument('--output',type=Path,default=OUTPUT); args=p.parse_args()
    for name,path in [('TC',args.font),('TCBold',args.bold_font)]:
        if not Path(path).is_file(): p.error(f'Font missing: {path}; supply embeddable Traditional Chinese TrueType fonts.')
        pdfmetrics.registerFont(TTFont(name,path))
    data=json.loads((SOURCE/'toy-reference.json').read_text(encoding='utf-8'))
    original=json.loads((SOURCE/'content.json').read_text(encoding='utf-8'))
    legacy={i['id']:u['id'] for u in original['units'] for i in u['items']}
    units={u['id']:u['subject'] for u in original['units']}
    rows=[r for s in data['subjects'] for u in s['units'] for r in u['rows']]
    assert len(legacy)==37 and len({r['id'] for r in rows})==len(rows)
    actual_units=[u['id'] for s in data['subjects'] for u in s['units']]
    assert len(set(actual_units))==len(actual_units) and set(actual_units)==set(units)
    covered=set()
    for s in data['subjects']:
        for u in s['units']:
            assert units[u['id']]==s['id']
            for r in u['rows']:
                assert r['label'] and r['exampleLines'] and r['legacyIds'],r['id']
                assert all(legacy.get(lid)==u['id'] for lid in r['legacyIds']),r['id']
                covered.update(r['legacyIds'])
                if r.get('figure'): figure_geometry(r['figure'],r['id'])
    assert covered==set(legacy),f'Uncovered items: {set(legacy)-covered}'
    text=json.dumps(data,ensure_ascii=False)
    assert '\ufffd' not in text and '\u2212' not in text and '\\u0000' not in text
    for font in ['TC','TCBold']:
        missing=set(text)-set(map(chr,pdfmetrics.getFont(font).face.charWidths))
        assert not missing,f'Missing glyphs in {font}: {missing}'
    normal=ParagraphStyle('body',fontName='TC',fontSize=12.2,leading=18.3,textColor=INK,wordWrap='CJK')
    bold=ParagraphStyle('label',parent=normal,fontName='TCBold',fontSize=12.1,leading=18.3)
    note=ParagraphStyle('note',parent=normal,fontSize=9.3,leading=13.5,textColor=MUTED)
    args.output.mkdir(parents=True,exist_ok=True)
    manifest={'format':'concepts-and-toy-questions','inputs':{n:source_sha(n) for n in INPUTS},'reportlab':reportlab.Version,'legacyItemCount':37,'rowCount':len(rows),'fonts':[{'name':pdfmetrics.getFont(n).face.name.decode(),'sha256':sha(Path(f))} for n,f in [('TC',args.font),('TCBold',args.bold_font)]],'pdfs':[]}
    for subject in data['subjects']:
        pages=[]
        for u in subject['units']:
            page={'unit':u,'rows':[],'used':0}
            for r in u['rows']:
                lp=paragraph(r['label'],bold); rp=paragraph('\n'.join(r['exampleLines']),normal)
                _,lh=lp.wrap(SPLIT-MARGIN-22,1000); _,rh=rp.wrap(BODY_WIDTH,1000)
                fig=r.get('figure'); height=max(lh,rh+(fig['height']+10 if fig else 0))+18
                assert height<=H-178-BOTTOM,(r['id'],'row too tall')
                capacity=H-(178 if not pages else 145)-BOTTOM
                if page['rows'] and (page['used']+height>capacity or r.get('pageBreakBefore')):
                    pages.append(page); page={'unit':u,'rows':[],'used':0}
                page['rows'].append((r,lp,rp,lh,rh,height)); page['used']+=height
            if page['rows']:
                # Keep a short final unit page readable without stranding one example.
                while page['used']<240 and pages and pages[-1]['unit']['id']==u['id'] and len(pages[-1]['rows'])>2:
                    moved=pages[-1]['rows'][-1]
                    if page['used']+moved[-1]<=H-145-BOTTOM and pages[-1]['used']-moved[-1]>=240:
                        pages[-1]['rows'].pop(); pages[-1]['used']-=moved[-1]
                        page['rows'].insert(0,moved); page['used']+=moved[-1]
                    else: break
                pages.append(page)
        path=args.output/subject['filename']; c=canvas.Canvas(str(path),pagesize=A4,pageCompression=1,invariant=1)
        c.setTitle(f"四上{subject['name']}｜觀念與玩具版考題"); c.setAuthor('Aiden Study'); c.setSubject('獨立觀念／技術與原創玩具版考題；不附答案')
        coverage=[]
        for number,page in enumerate(pages,1):
            c.setFillColor(INK); c.setFont('TCBold',20); c.drawString(MARGIN,H-46,f"{subject['name']}｜家長備考速查")
            c.setFillColor(MUTED); c.setFont('TC',10); c.drawString(MARGIN,H-66,f"四年級上學期　{subject['range']}　／　觀念與玩具版考題")
            shift=0 if number==1 else 33
            if number==1:
                scope=paragraph(data['scope'],note); _,sh=scope.wrap(W-2*MARGIN,100); assert sh<=28
                scope.drawOn(c,MARGIN,H-79-sh)
            c.setFillColor(PALE); c.rect(MARGIN,H-137+shift,W-2*MARGIN,27,fill=1,stroke=0)
            c.setFillColor(INK); c.setFont('TCBold',12)
            continued=number>1 and pages[number-2]['unit']['id']==page['unit']['id']
            c.drawString(MARGIN+9,H-128+shift,page['unit']['title']+('（續）' if continued else ''))
            c.setFillColor(MUTED); c.setFont('TCBold',10); c.drawString(MARGIN+8,H-155+shift,'觀念／技術'); c.drawString(SPLIT,H-155+shift,'玩具版考題')
            c.setStrokeColor(LINE); c.line(MARGIN,H-163+shift,W-MARGIN,H-163+shift); top=H-178+shift
            for r,lp,rp,lh,rh,height in page['rows']:
                lp.drawOn(c,MARGIN+8,top-lh); rp.drawOn(c,SPLIT,top-rh)
                if r.get('figure'): draw_figure(c,r['figure'],SPLIT,top-rh-10)
                bottom=top-height; assert bottom>=BOTTOM,(r['id'],bottom)
                c.setStrokeColor(LINE); c.setLineWidth(.5); c.line(MARGIN,bottom+10,W-MARGIN,bottom+10)
                row_sha=hashlib.sha256(json.dumps(r,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode('utf-8')).hexdigest()
                coverage.append({'id':r['id'],'legacyIds':r['legacyIds'],'page':number,'label':r['label'],'sourceSha256':row_sha,'top':round(top,2),'bottom':round(bottom,2),'figure':bool(r.get('figure'))}); top=bottom
            c.setStrokeColor(LINE); c.line(MARGIN,34,W-MARGIN,34)
            c.setFillColor(MUTED); c.setFont('TC',9); c.drawString(MARGIN,20,'原創簡化題 · 每列一項觀念或技術 · 不附答案'); c.drawRightString(W-MARGIN,20,f'{number} / {len(pages)}'); c.showPage()
            print(f"{subject['id']} page {number}: {page['unit']['id']}, {len(page['rows'])} rows; bottom {top:.1f} pt")
        c.save()
        legacy_coverage=[{'id':lid,'rows':[r['id'] for r in coverage if lid in r['legacyIds']],'pages':sorted({r['page'] for r in coverage if lid in r['legacyIds']})} for lid in legacy if any(lid in r['legacyIds'] for r in coverage)]
        manifest['pdfs'].append({'file':subject['filename'],'sha256':sha(path),'pages':len(pages),'rowCount':len(coverage),'coverage':coverage,'legacyCoverage':legacy_coverage})
    (args.output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
if __name__=='__main__': main()
