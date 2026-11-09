# Signal Atlas — GitHub Pages 배포 패키지 (5개 자산 · AI CAPEX)

> 마지막 패키지 검증: 2026-11-09  |  버전 3.0  |  **텔레그램 없음 · 자동 주문 없음**

미국 S&P 500, AI 관련 주식, 한국 커버드콜, 달러 금, 현금의 투자 원칙을 같은 화면에서 점검합니다. **기업 실적 PDF를 올리면 CAPEX 숫자를 브라우저에서 추출**하고 분기별 통계·AI 투자 판단 근거에 반영합니다. 숫자 또는 차기년도 투자 계획이 불명확하면 **판단 보류**로 표시합니다.

## 1. 전체 파일 구조 — ZIP 압축 해제 후 내용 전체 업로드

```text
signal-atlas/
├── index.html                     # 웹사이트 전체 화면
├── assets/
│   ├── app.js                     # 화면·PDF 업로드·기록 저장·백업
│   ├── strategy.js                # 5개 자산 매수·매도 판단 엔진
│   ├── pdf-analyzer.js            # 기업 PDF의 CAPEX 추출기
│   ├── seed-filings-2026q3.js     # Alphabet, Meta, Amazon 2026Q3 사전 분석 기록
│   └── styles.css                 # 반응형 디자인
├── data.json                      # 첫 배포 전 빈 시장 시세 스냅샷
├── collect.py                     # 실거래 시세 수집 Python 프로그램
├── requirements.txt              # Python 패키지 목록
├── .github/
│   └── workflows/
│       └── update-market.yml     # 평일 시세 수집 + GitHub Pages 자동 배포
├── tests/
│   ├── test-parser.js
│   ├── test-collector.py
│   ├── test-q3-filings.js
│   ├── test-strategy.js
│   ├── alphabet-pdf-rows.json
│   ├── meta-pdf-rows.json
│   └── amazon-pdf-rows.json
├── .gitignore
└── README.md
```

**중요:** GitHub에 ZIP 파일 1개만 올리지 마세요. 압축을 풀어 `index.html`, `assets/`, `.github/` 등을 저장소 **최상위**에 모두 배치하세요. PDF 원본은 패키지에 포함하지 않았습니다. `tests/*-pdf-rows.json`은 수치 추출 테스트를 위한 재구성 텍스트 자료입니다.

## 2. 5개 투자 원칙 / 매수·매도 규칙

| 투자 대상 | 매수/추가 투자 검토 조건 | 축소/현금 확보 검토 조건 |
| --- | --- | --- |
| **① 미국 S&P 500** | 1년 최고 종가 대비 **20% 이상 하락** **AND** 예상 이익수익률 − 미국 10년 국채금리 **≥2%p** | 예상 이익수익률 − 미국 10년 국채금리 **≤0.5%p** |
| **② AI·빅테크** | AIQ ETF 대용 낙폭 **≥30%** **AND** 4개 기업의 **다음 해** 투자 유지/확대 계획 확인 | Microsoft·Alphabet·Amazon·Meta 중 **2개 이상**의 **다음 해 CAPEX 축소 발표**가 문서 근거와 사용자 검증으로 확인된 경우 |
| **③ 한국 커버드콜** | 코스피 낙폭 **≥25%** **AND** 예상 PER **≤8배** | 반도체 수출 증가율 **3회 연속 둔화** **AND** 메모리 가격 **2개월 연속 하락** |
| **④ 금** | 달러 기준 금 선물 낙폭 **≥25%** **AND** (중앙은행 금 매입 유지 **OR** 미국 금리 인하 전환) | 미국 금리가 지속 상승 **AND** 중앙은행 금 매입 감소 |
| **⑥ 현금** | 전체 투자자산이 고점 대비 **15%·25%·35%** 하락한 경우 단계별 투입 검토 | 주식이 국채 대비 비싸지면 현금 확보 검토 |

**사용자의 이번 요청에서 ⑤ 암호화폐가 빠져 있으므로 구현 대상에서도 제외**했습니다. 항목 번호 ⑥은 원문을 따라 유지했습니다.

**매매는 실행되지 않습니다.** 모든 신호는 '매수 검토', '축소 검토', '판단 보류' 같은 설명형 상태입니다. 자동 수집 대상이 아닌 지표(예상 이익수익률, forward PER, 반도체 수출 등)는 직접 입력해야 합니다. 최근 1년 종가 최고점은 사상 최고가와 다를 수 있습니다.

### AI 투자 판단 안전장치

- **실제 CAPEX 증가**는 '집행 확대' 근거이지, **다음 해 투자 유지**의 확정 증거가 아닙니다.
- 다음 연도 CAPEX 문장이 자동 감지되어도 **원문 페이지 확인 / 투자 연도 확인 / 검증 완료 체크**까지 해야 4대 기업 집계에 들어갑니다.
- 2026년 연간 CAPEX 가이던스를 2027년 계획이라고 착각하지 않습니다.
- 명확한 계획 없는 기업은 미확인으로 남고, 나머지 기업의 지출이 증가하더라도 자동 매수 확정하지 않습니다.
- 실적 시즌(1·4·7·10월 말)에 새 PDF를 추가해 분기 흐름을 추적하세요.

## 3. 초기 등록된 PDF 분석 결과 (2026년 3분기)

다음은 사용자가 제공한 실적발표 PDF 내용을 근거로 정리한 **기업 전체 설비투자액**입니다. **AI 전용 CAPEX가 아닙니다.** 단위는 *십억 미국 달러(B USD)* 입니다.

| 회사 | 2026 Q3 | 2025 Q3 | YoY | CAPEX 정의 | 보고서 |
| --- | ---: | ---: | ---: | --- | --- |
| Alphabet | 51.355 | 23.953 | +114.4% | 유형자산 현금 취득액 | PDF p.6, p.8 |
| Meta | 34.906 | 19.374 | +80.2% | 유형자산 취득 **33.942** + 금융리스 원금 **0.964** | PDF p.2, p.8 |
| Amazon | 77.259 | 35.095 | +120.1% | 유형자산 취득 **총액**(매각대금/인센티브 차감 전) | PDF p.6 |
| Microsoft | — | — | — | 자료 없음 | 별도 PDF 필요 |

추가 근거:
- **Alphabet:** 2025 Q4 27.851 → 2026 Q1 35.674 → Q2 44.924 → Q3 51.355B, 최근 12개월 159.804B. 다음 해 CAPEX 계획은 첨부 파일에서 미확인.
- **Meta:** 2026년 CAPEX 가이던스 **135~145B**, 2027년에도 공격적 투자를 지속하겠다는 **정성적 언급**. 하지만 2027년 수치나 CAPEX 증감률은 제시하지 않았으므로 투자축소/유지 확정 집계에는 넣지 않음.
- **Amazon:** 2026년 현금 CAPEX 가이던스 **약 220B**. 2027~28년 AWS 매출 성장 전망은 2027년 CAPEX 계획으로 해석하지 않음.

**현재 결론:** 3개 기업의 실제 CAPEX는 전년 동기보다 증가. 그러나 4개 기업의 차기년도 투자 유지/축소 계획 검증이 충분하지 않아 **AI 매수·매도 규칙은 모두 판단 보류**입니다. 주가 낙폭 30% 조건도 별도로 필요합니다.

## 4. 사용법: PDF → 숫자 → AI 투자 판단

1. 사이트 접속 → 왼쪽 **AI · CAPEX 분석** 클릭.
2. Microsoft / Alphabet / Amazon / Meta의 실적발표 **텍스트 선택 가능한 PDF** 선택 또는 드래그앤드롭. 한 번에 최대 10개, 파일당 28MB 이하.
3. PDF.js가 브라우저 내부에서 페이지·현금흐름표 등을 판독. 해당 기업과 분기, 실제 CAPEX, YoY, (근거가 있을 경우) QoQ와 TTM, 출처 페이지를 보여 줍니다.
4. 같은 회사·분기 PDF를 반복 업로드하면 숫자를 중복 집계하지 않고 기록을 갱신하거나 검증된 초기 기록을 유지합니다.
5. **차기년도 가이던스**는 PDF 원문을 대조해 방향, 원문, 페이지, '검증 완료'를 별도로 설정해야 전략 신호에 집계됩니다.
6. 결과는 **그 브라우저에만** 저장됩니다. `분석 JSON` 또는 `CAPEX CSV`로 내려받을 수 있습니다.
7. *공개 사이트의 모든 방문자에게 같은 최신 데이터를 표시하려면*: `공개 시드 JS`를 내려받고 이 저장소의 `assets/seed-filings-2026q3.js`를 교체한 다음 커밋/푸시합니다. 자료가 공개됨을 이해한 뒤 실행하세요.

**개인정보/제약:** 원본 PDF 파일은 웹서버나 GitHub로 올라가지 않습니다. PDF.js 라이브러리 파일은 CDN에서 받아오므로 인터넷 연결이 필요합니다. 스캔 이미지 PDF는 OCR 없이 분석할 수 없고, 기업별 표 구조가 달라 잘못 추출할 수 있습니다. 현재는 **규칙 기반 PDF 파서**이지 외부 LLM 호출 서비스가 아닙니다. 숫자 검증과 가이던스 검증 UI를 반드시 사용하세요. **Microsoft에 대한 다양한 표 형식은 아직 검증된 샘플이 없어 숫자 자동 인식 정확도가 제한적**입니다.

## 5. GitHub Pages 배포 (새 저장소 기준)

1. GitHub에서 공개 저장소 `signal-atlas`를 새로 만듭니다(저장소 이름은 자유).
2. 이 ZIP을 압축 해제하고 **내부 파일/폴더 전체를 저장소 최상위에 업로드**합니다. 특히 `.github/workflows/update-market.yml` 누락 주의. `index.html`은 저장소 최상위여야 합니다.
3. GitHub 저장소 **Settings → Actions → General → Workflow permissions → Read and write permissions** 설정. (시장 시세 `data.json` 커밋에 필요)
4. **Settings → Pages → Build and deployment → Source → GitHub Actions** 선택.
5. **Actions → Signal Atlas - refresh market and publish dashboard → Run workflow** 선택. 테스트 → 시장 시세 수집 → `data.json` 커밋 → Pages 배포가 진행됩니다.
6. 공개 주소는 `https://kangdy9801.github.io/signal-atlas/` (저장소 이름이 `signal-atlas`일 때)입니다. 실제 배포되기 전에는 이 주소에서 앱이 열리지 않습니다.
7. 평일 **18:30 KST** 시장 데이터 수집 예약. GitHub Actions 실행은 지연될 수 있고 공급자 연결 실패 시 기존 데이터가 남을 수 있습니다. 홈페이지에서 기준일을 확인하세요.

**기존 Signal Atlas 저장소에 덮어쓸 때:** 오래된 텔레그램 워크플로 `.github/workflows/*telegram*`, `notify.py`, `signal-state.json` 등을 제거해야 기존 알림이 계속 나가지 않습니다. 이 패키지에는 텔레그램 토큰·Secret 설정이 필요 없습니다. 다른 저장소(`macro-dashboard`, `kr-trade-monitor`)는 변경하지 마세요.

### 터미널 배포 예시

```bash
# GitHub에서 signal-atlas 저장소를 먼저 만든 뒤
# 로컬에 ZIP을 풀어 그 안의 모든 파일을 signal-atlas 폴더로 복사한 상태에서 실행
git init
git branch -M main
git add .
git commit -m "Deploy Signal Atlas v3"
git remote add origin https://github.com/kangdy9801/signal-atlas.git
git push -u origin main
```

**기존 저장소에 이미 커밋이 있으면** 새로 `git init` 하기보다 저장소를 클론해서 파일을 복사한 후 커밋/푸시하세요. 기존 파일을 삭제/덮어쓰기 전에 백업을 권장합니다.

## 6. 데이터 자동 수집 범위와 연결 한계

`collect.py`는 공개 시세 서비스(yfinance/Yahoo Finance)를 사용합니다. 공개 `data.json`에는 다음 수치만 자동 채웁니다.

| 자동 입력 | 티커·방법 | 용도 |
| --- | --- | --- |
| S&P 500 낙폭 | `^GSPC` 1년 종가 최고점 대비 | 주식 하락 여부 |
| AI 대용 바스켓 낙폭 | `AIQ` ETF 1년 종가 최고점 대비 | AI 주식 하락 여부(완벽한 대표지수는 아님) |
| 코스피 낙폭 | `^KS11` 1년 종가 최고점 대비 | 한국 시장 하락 여부 |
| 달러 금 낙폭 | `GC=F` 금 선물 1년 종가 최고점 대비 | 원화 환산 금값 사용하지 않음 |
| 미국 국채금리 | `^TNX` 10년 수익률(%) | S&P 상대 수익률 비교 |

**아직 자동 입력되지 않는 것:** S&P 예상 이익수익률(Forward PER 역수), KOSPI 예상 PER, 반도체 수출 증가율 연속 관측치, DDR/NAND 가격 연속 관측치, 중앙은행 금 매입 추세, 미국 금리 인하 전환/지속 인상 판단, 사용자 포트폴리오 낙폭, 2027년 CAPEX 문서 검증. 이 값은 `시장 지표 입력`에 직접 입력해야 합니다. 빈 값은 절대 임의 생성하지 않습니다.

아래 두 기존 연구 사이트는 **연계 참고 링크 및 피드 접속상태 진단**에 사용합니다. 사이트 간 데이터 스키마·관측 기준월을 검증하지 않은 상황에서 투자규칙에 **직접 자동 매핑했다고 주장하지 않습니다**.

- [Macro Dashboard](https://kangdy9801.github.io/macro-dashboard/): 미국 지수·미국 국채 금리·금 등.
- [KR Trade Monitor](https://kangdy9801.github.io/kr-trade-monitor/): 반도체 수출·DDR5·NAND·산업 지표. 이 사이트에서 브라우저에만 저장한 신규 PDF 분석 기록은 공개 `assets/seed.js`에 바로 반영되지 않습니다.

향후 두 소스의 검증된 JSON 계약을 만들면 `semiExportM1~M4`, `memoryPriceM1~M2` 같은 필드를 자동 입력하도록 확장할 수 있습니다.

## 7. 로컬 실행 / 검증

```bash
python -m http.server 8000
# http://localhost:8000 방문
```

시장 데이터 수집까지 실행하려면:

```bash
python -m pip install -r requirements.txt
python collect.py
```

PDF·전략 테스트(Node.js 18+):

```bash
node tests/test-parser.js
node tests/test-q3-filings.js
node tests/test-strategy.js
python tests/test-collector.py
```

## 8. 해석·보안 주의사항

- 표의 CAPEX는 **전체 설비투자액**, AI 관련 투자만 분리한 액수가 아닙니다. Meta의 리스 포함 정의 등으로 회사 간 절대금액 비교에 주의하세요.
- 커버드콜은 상승 수익이 제한될 수 있고 주가 하락 손실을 피하지 못합니다.
- 현금 단계별 진입은 기록·판정일 뿐 실제 자금을 집행하지 않습니다. 분할 투입액은 직접 정하세요.
- 데이터 수집 실패, API 정책 변경, 자료 지연, 주가 시차 등의 가능성이 있습니다. 마지막 갱신일·출처와 판독 신뢰도를 확인하세요.
- PDF 분석 내용이 브라우저의 `localStorage`에 저장되어 브라우저 초기화/기기 변경 시 사라질 수 있습니다. JSON 백업을 보관하세요.
- **자동 주문 없음, 텔레그램 발송 없음, 유료 AI API/서버 없음.** 연구용 참고 도구이며 투자 결과를 보장하지 않습니다.
