# Signal Atlas v4.1 — GitHub Pages 자동 투자지표 모니터

**5개 투자 전략 · 큰 글씨 · 두 대시보드 실제 수치 연동 · AI 기업 PDF CAPEX 분석**  
**자동 매매 없음 / 텔레그램 알림 없음 / 유료 API 키 필요 없음**

Signal Atlas는 다음 투자 *검토* 규칙을 실행합니다. 자료가 부족하면 '매수' 또는 '매도'라고 단정하지 않고 **판단 보류**로 남깁니다.

## 1. 이번 버전에서 바뀐 기능

- **가독성:** 본문과 조건, 표, 메뉴, 버튼의 글자 크기를 키우고 PC용 자산 카드 2열 배치로 변경
- **실제 데이터 연결:** Macro Dashboard의 `data/market.json`으로 **S&P500 낙폭 / USD 금 선물 낙폭 / 미국 10년물 금리** 계산
- **실제 데이터 연결:** KR Trade Monitor의 **공개** `assets/seed.js`로 **반도체 수출 YoY 4개월치 / DDR5·NAND 2개월 가격 추세** 계산
- **보조 가격:** 기존 Yahoo Finance/yfinance로 AIQ(AI ETF 대용)와 KOSPI 낙폭 수집, 공개 매크로 연결 실패 시 S&P/금 보조 수집
- **자동화:** GitHub Actions가 소스 데이터를 주기적으로 가져와 `data.json`을 다시 작성·커밋하고 GitHub Pages를 배포
- **데이터 진단:** 자동 매핑 항목의 출처, 관측 기준일, 수집 로그와 수동입력 우선순위 표시
- **PDF 기능 유지:** Microsoft·Alphabet·Amazon·Meta의 실적 PDF 업로드, CAPEX 추출 및 출처 페이지 검증, 브라우저 누적 저장. 제공한 2026Q3 Alphabet·Meta·Amazon 자료가 초기 포함됨

## 2. GitHub에 올릴 전체 파일

압축파일의 **내용물 전체**를 저장소 최상위에 올리세요. ZIP 하나만 업로드하면 사이트가 실행되지 않습니다.

```text
signal-atlas/
├── index.html
├── assets/
│   ├── app.js                  # UI / PDF 업로드 / 실적 통계
│   ├── pdf-analyzer.js         # PDF 숫자 추출
│   ├── seed-filings-2026q3.js  # 3개 기업 사전 검증 2026 Q3 PDF 기록
│   ├── strategy.js             # 5개 자산의 3값 논리(True/False/미확인)
│   └── styles.css              # 커진 글자, 반응형 UI
├── collect.py                  # 공개 두 소스 실제 읽기 + 가격 보조 수집
├── collect_extra.py            # v4.1: FactSet 선행 P/E · FRED 기준금리 · WGC 중앙은행 금
├── data.json                   # 초기에는 미수집, Actions가 이후 갱신
├── requirements.txt           # yfinance 보조 수집용
├── .github/workflows/update-market.yml
├── tests/                     # PDF 추출·신호·두 피드 연결 오프라인 회귀 테스트
├── .gitignore
└── README.md
```

### Pages 자동 배포 (새 저장소)

1. [github.com/new](https://github.com/new)에서 **public** 저장소 `signal-atlas` 생성 (기존 저장소를 사용해도 됩니다).
2. ZIP의 파일/폴더 전체를 GitHub의 **Add file → Upload files**로 업로드합니다. `.github/workflows/update-market.yml` 경로 유지.
3. 저장소 **Settings → Actions → General → Workflow permissions**에서 **Read and write permissions** 선택 (자동 `data.json` 커밋에 필요).
4. **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions** 선택.
5. 저장소 **Actions** 탭 → **Signal Atlas - sync source dashboards and publish** → **Run workflow** 클릭.
6. 작업 완료 후 `https://kangdy9801.github.io/signal-atlas/` 접속 (저장소 이름이 `signal-atlas`이고 소유자가 `kangdy9801`인 경우).
7. 웹사이트 **데이터 · 백업** 화면에서 Macro Dashboard / KR Trade Monitor의 **수치 자동 연결** 상태와 기준월을 확인합니다. 첫 업로드 직후 `data.json`은 빈 값이므로 **수동으로 첫 Actions 실행이 필요합니다**.

**기존 저장소 덮어쓰기:** 구버전 텔레그램 워크플로와 `.py` 알림 프로그램이 남아 있으면 별도로 삭제하세요. 이 패키지는 텔레그램 메시지를 발송하지 않지만, 저장소의 **기존 워크플로를 자동 삭제하지는 않습니다**.

### GitHub 예약 실행 시각

- **월~토 오전 10:30 KST**: 두 대시보드가 공개한 값을 동기화
- **월~금 오후 7:30 KST**: 장중/일간 공개 값 재확인
- GitHub 예약 작업은 지연될 수 있습니다. 즉시 수집하려면 Actions에서 **Run workflow** 실행.
- 브라우저에서 열린 Signal Atlas 페이지는 약 **30분마다 최신 배포된 `data.json`을 다시 읽습니다.** 서버 수집은 GitHub Actions가 수행합니다.

## 3. 데이터 연동 원리 및 실제 매핑

### [Macro Dashboard](https://kangdy9801.github.io/macro-dashboard/)

원본 공개 파일: [`data/market.json`](https://raw.githubusercontent.com/kangdy9801/macro-dashboard/main/data/market.json)

| 원본 필드 | Signal Atlas 필드 | 적용 |
| --- | --- | --- |
| `series[id="spx"].data[].close` | `spDraw` | 최근 **365일 최고 종가** 대비 S&P500 하락률 |
| `series[id="us10y"].data[].value` | `treasuryYield` | 미국 10년물 국채 금리 (%) |
| `series[id="gold"].data[].close` | `goldDraw` | 달러 기준 금 **선물** 365일 최고 종가 대비 낙폭 |

가격은 최신 관측일이 **8일 이상 오래됐으면 폐기**합니다. 금 선물은 만기 교체에 따라 가격 연속성이 달라질 수 있으며 실제 국내 원화 금 현물가격이 아닙니다. S&P 예상 이익수익률은 이 파일에 없습니다.

### [KR Trade Monitor — 분야별 흐름](https://kangdy9801.github.io/kr-trade-monitor/#s-sectors)

원본 공개 파일: [`assets/seed.js`](https://raw.githubusercontent.com/kangdy9801/kr-trade-monitor/main/assets/seed.js)

| 원본 필드 | Signal Atlas 필드 | 적용 |
| --- | --- | --- |
| 최신 기록 `trade.items["반도체"].yoy[-4:]` | `semiExportM1~M4` | **4개 월의 전년비 수출 증가율**, 오래된 순. **3번 연속 증가율 하락**이면 '둔화' |
| 최신 기록 `trade.memory.ddr5[-3:]` | `memoryPriceM1~M2` | DDR5 16Gb 메모리 고정가격 월간 변화율 (직전/최신) |
| `trade.memory.ddr5/nand[-3:]` | `memoryTwoMonthDecline` | **DDR5와 NAND가 각각 2개월 모두 하락**했을 때 `true` |

**한국 커버드콜 비중 축소 신호**는 수출 둔화 3회와 메모리 가격 2개월 연속 동반 하락이 **동시에** 확인될 때만 발생합니다. 공개 seed의 **보고서 기준월**과 원본 필드를 확인하며, **최신 보고월 종료일부터 75일 넘게 지난 기록은 신호에 사용하지 않습니다**.

**중요한 제한:** KR Trade Monitor에 PDF를 업로드한 내용은 그 사이트의 브라우저 저장소에만 저장됩니다. 사용자가 그 사이트에서 **`seed.js 만들기` → 원본 KR 저장소 `assets/seed.js` 커밋**을 완료해야 Signal Atlas가 새 보고월 값을 자동으로 가져옵니다. 두 사이트는 서로 수정·삭제하지 않습니다.

### v4.1 추가 자동 연결

| 원본 | Signal Atlas 필드 | 규칙 |
| --- | --- | --- |
| [FactSet Earnings Insight](https://insight.factset.com/) 주간 PDF (`EarningsInsight_MMDDYY.pdf`) | `earningsYield` | 리포트의 선행 12M P/E와 종가로 선행 EPS 역산 → 최신 S&P500 종가로 나눠 **매일** 이익수익률 계산. 14일 넘은 리포트는 사용 안 함 |
| [FRED DFEDTARU](https://fred.stlouisfed.org/series/DFEDTARU) (기준금리 상단) | `fedCutPivot`, `fedCutCount` | 마지막 인상 이후 인하 횟수. **1회 = 관심 단계(전환 아님), 2회 이상 = 인하 전환** |
| [WGC Gold Demand Trends](https://www.gold.org/goldhub/research/gold-demand-trends) 중앙은행 페이지 | `cbBuyingMaintained`, `cbBuyingDeclining` | 최신 분기 순매입을 **전년 동기**와 비교. 유지 = 순매입 > 0 그리고 전년 동기 이상, 감소 = 전년 동기 미만 |

전년 동기 값은 당시 처음 발표된 수치이며, WGC가 이후 수정한 값과 다를 수 있습니다.

### 직접 입력으로 남는 지표

- **KOSPI 12개월 선행 PER**: 하단·상단 **범위**와 **기준일**로 입력. 상단 ≤ 8배면 충족, 하단 > 8배면 미충족, 8배에 걸치면 판단 보류. 기준일이 60일을 넘으면 조건 옆에 '갱신 권장'을 표시
- **미국 금리 지속 상승** (정의 확정 후 자동화 예정)
- 사용자의 **투자자산 전체 고점 대비 하락률**
- 4대 빅테크 다음 해 CAPEX 계획의 검증된 근거(기업 PDF마다 개별 검증 필요)

웹사이트 **시장 지표 입력**에서 이 값들을 입력하면, 자동 시장 데이터와 합쳐 조건을 재계산합니다. 수동값은 자동값보다 우선합니다.

## 4. 5가지 투자 원칙

| 자산 | 매수 검토 | 축소·현금 확보 검토 |
| --- | --- | --- |
| ① 미국 S&P500 | 최고 종가 대비 ≥20% 하락 **AND** 예상 이익수익률-미국 국채금리 ≥2%p | 그 차이가 ≤0.5%p |
| ② AI 관련 주식 | AIQ 대용 지수 ≥30% 하락 **AND** 4대 기업 다음 회계연도 투자 유지·확대 계획 검증 | 4곳 중 **2곳 이상** 다음 회계연도 CAPEX 축소 계획 확인 |
| ③ 한국 커버드콜 | 코스피 낙폭 ≥25% **AND** 예상 PER ≤8배 | 반도체 수출 증가율 3회 연속 둔화 **AND** DDR5·NAND 모두 2개월 연속 하락 |
| ④ 금 | 달러 금값 ≥25% 하락 **AND** (중앙은행 금 매입 유지 **OR** 미국 금리 인하 전환) | 미국 금리 지속 상승 **AND** 중앙은행 금 매입 감소 |
| ⑥ 현금 | 전체 투자자산 낙폭 15%, 25%, 35%에서 단계적으로 투자 검토 | S&P 주식 이익수익률과 국채금리 차이 ≤0.5%p인 고평가 국면에 확보 검토 |

①~④의 판단은 시장가격만의 신호가 아니며, ⑥ 현금 하락률은 **사용자 자산 평가액**이므로 자동 수집되지 않습니다. **⑤ 암호화폐는 사용자 요청에 따라 제외**했습니다.

## 5. AI 기업 실적 PDF 분석

**AI · CAPEX 분석실**에서 Microsoft, Alphabet, Amazon, Meta의 **텍스트 선택 가능한 PDF**를 업로드하면 브라우저 내 PDF.js가 CAPEX 및 페이지 출처를 찾습니다. 이전에 업로드한 2026년 3분기 Alphabet/Meta/Amazon 자료의 수치·정의 차이를 사전 데이터로 포함했습니다.

- Alphabet: 2026 Q3 CAPEX $51.355B (전년 동기 $23.953B)
- Meta: $34.906B = 유형자산 취득 $33.942B + 금융리스 상환 $0.964B (전년 동기 $19.374B)
- Amazon: $77.259B 유형자산 취득 총액 (전년 동기 $35.095B)
- Microsoft: 보고서가 아직 없어 **미확인**

**회사 전체 설비투자액**을 **AI 전용 CAPEX**라고 표시하지 않습니다. 2026년 지출이나 가이던스는 2027년 투자 축소/유지 확정과 다른 개념입니다. **다음 회계연도 계획은 근거 문장·페이지·연도 검증이 되어야 신호에 집계**됩니다. PDF가 업로드된 브라우저에서 분석값과 확인 상태를 보관하고 JSON/CSV 및 공개 시드 JS로 내보낼 수 있습니다.

## 6. 로컬 테스트

정적 웹은 아래처럼 실행할 수 있습니다.

```bash
python -m http.server 8000
# http://localhost:8000
```

데이터 수집에는 외부 인터넷이 필요합니다. 브라우저에서 자동 시세를 보려면 먼저 `collect.py` 실행이 필요합니다.

```bash
python -m pip install -r requirements.txt
python collect.py
node tests/test-parser.js
node tests/test-q3-filings.js
node tests/test-strategy.js
python tests/test-collector.py
python tests/test-extra.py
```

`tests/test-collector.py`는 **외부 네트워크 없이** 원본 저장소에 공개된 필드 계약과 같은 샘플로 파싱·자료 지연·보류 처리를 검증합니다. 이 배포 패키지의 자동 수집이 사용자의 GitHub 계정에서 이미 실행됐다는 의미는 아닙니다.

## 7. 주의사항

- **GitHub Pages 배포 및 예약 실행 설정은 포함했지만 실제 사용자 저장소에 올리거나 Actions를 활성화하지 않았습니다.** GitHub에 업로드해 배포해야 자동화가 시작됩니다.
- 공개 원본 저장소의 필드 구조가 변경되거나 신규 자료가 seed.js에 게시되지 않으면 해당 지표는 비워 둡니다.
- 수집한 `data.json`은 일반 공개 파일입니다. **로그인 정보나 비공개 포트폴리오 수치를 코드에 넣지 마세요.**
- PDF 원본을 서버로 보내지 않고 브라우저에서만 읽으므로 여러 컴퓨터에서 분석 기록이 자동 동기화되지 않습니다.
- 커버드콜 ETF는 상승 수익이 제한될 수 있고 하락 손실 위험도 있습니다. 앱은 참고용 조건 비교 도구이며 매매·투자수익을 보장하지 않습니다.
