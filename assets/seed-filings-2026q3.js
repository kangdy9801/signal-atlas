window.SIGNAL_ATLAS_FILINGS_VERSION = 'filings-q3-2026-r1';
/* Prechecked extracted values from three user-provided Q3 2026 earnings PDFs. No original PDF bytes included. */
window.SIGNAL_ATLAS_FILINGS_SEED = [
  {
    "id": "Alphabet-2026Q3-filings-verified-20261109",
    "company": "Alphabet",
    "period": "2026Q3",
    "year": 2026,
    "quarter": 3,
    "filename": "2026q3-alphabet-earnings-release(1).pdf",
    "quarterCapexM": 51355,
    "previousYearCapexM": 23953,
    "ttmCapexM": 159804,
    "quarterHistory": [
      {
        "period": "2025Q4",
        "capexM": 27851,
        "page": 8
      },
      {
        "period": "2026Q1",
        "capexM": 35674,
        "page": 8
      },
      {
        "period": "2026Q2",
        "capexM": 44924,
        "page": 8
      },
      {
        "period": "2026Q3",
        "capexM": 51355,
        "page": 8
      }
    ],
    "yoy": 114.39903143656326,
    "qoq": 14.31528804202653,
    "trend": "expanding",
    "capexDefinition": "ppe_cash_purchases",
    "capexDefinitionLabel": "유형자산 현금 취득액",
    "currentYearGuidance": null,
    "forwardOutlook": {
      "type": "unknown",
      "label": "차기년도 투자 계획 미확인",
      "page": null,
      "text": "",
      "period": "2027",
      "notNumericCapex": true
    },
    "additional": {},
    "guidance": {
      "status": "unknown",
      "text": "차기년도 CAPEX 축소·유지·확대의 명시적 수치/계획을 이 PDF에서 확정하지 못했습니다.",
      "page": null,
      "period": null,
      "auto": true,
      "verified": false
    },
    "confidence": "high",
    "evidence": [
      {
        "page": 6,
        "label": "현금흐름표: 당기·전년 분기 CAPEX",
        "text": "Purchases of property and equipment (23,953) (51,355) (63,596) (131,953)"
      },
      {
        "page": 8,
        "label": "4개 분기·최근 12개월 CAPEX",
        "text": "Less: purchases of property and equipment (27,851) (35,674) (44,924) (51,355) (159,804)"
      },
      {
        "page": 1,
        "label": "AI 인프라 관련 언급",
        "text": "Google Cloud Platform (GCP) across enterprise AI infrastructure and enterprise AI solutions, as well as core"
      },
      {
        "page": 7,
        "label": "AI 인프라 관련 언급",
        "text": "from the sale of TPU systems."
      }
    ],
    "importedAt": "2026-11-09T00:00:00.000Z",
    "pages": 9,
    "notes": "2026년 3분기 51,355M USD. 현금흐름표(6페이지)와 분기별 현금흐름·FCF 표(8페이지) 근거. AI 전용 CAPEX가 아니며 2027년 CAPEX 수치 가이던스는 없음.",
    "seed": true,
    "source": "user-uploaded-pdf"
  },
  {
    "id": "Meta-2026Q3-filings-verified-20261109",
    "company": "Meta",
    "period": "2026Q3",
    "year": 2026,
    "quarter": 3,
    "filename": "Meta-Reports-Third-Quarter-2026-Results-2026.pdf",
    "quarterCapexM": 34906,
    "previousYearCapexM": 19374,
    "ttmCapexM": null,
    "quarterHistory": [
      {
        "period": "2026Q3",
        "capexM": 34906,
        "page": 8
      }
    ],
    "yoy": 80.16929906059667,
    "qoq": null,
    "trend": "expanding",
    "capexDefinition": "ppe_plus_lease_principal",
    "capexDefinitionLabel": "유형자산 취득 + 금융리스 원금 상환",
    "currentYearGuidance": {
      "year": 2026,
      "lowB": 135,
      "highB": 145,
      "label": "135~145B USD",
      "page": 2,
      "definition": "유형자산 취득 + 금융리스 원금 상환",
      "text": "We anticipate 2026 capital expenditures, including principal payments on ínance leases, to be in the range of $135- 145 billion, narrowed from our prior outlook of $130-145 billion."
    },
    "forwardOutlook": {
      "type": "qualitative_support",
      "label": "차기년도에도 공격적 투자 의지(정성)",
      "page": 3,
      "text": "Looking beyond 2026, we are still developing our budget and capacity plans for next year, but we expect to continue investing aggressively to support both our core business and emerging AI initiatives. Our current capacity and what is scheduled to come online gives us the îexibility to allocate resources across model training, core business growth, and the development and support of new products. Our AI investments are already delivering substantial incremental advertising revenue through stronger",
      "period": "2027",
      "notNumericCapex": true
    },
    "additional": {
      "cashPurchasesCurrentM": 33942,
      "leasePrincipalCurrentM": 964,
      "cashPurchasesPreviousM": 18829,
      "leasePrincipalPreviousM": 545,
      "ytdCapexM": 85824
    },
    "guidance": {
      "status": "unknown",
      "text": "차기년도 CAPEX 축소·유지·확대의 명시적 수치/계획을 이 PDF에서 확정하지 못했습니다.",
      "page": null,
      "period": null,
      "auto": true,
      "verified": false
    },
    "confidence": "high",
    "evidence": [
      {
        "page": 8,
        "label": "현금흐름표: 유형자산 취득",
        "text": "Purchases of property and equipment (33,942) (18,829) (83,055) (48,308)"
      },
      {
        "page": 8,
        "label": "현금흐름표: 금융리스 원금 상환",
        "text": "Principal payments on finance leases (964) (545) (2,769) (1,770)"
      },
      {
        "page": 2,
        "label": "2026년 CAPEX 가이던스",
        "text": "We anticipate 2026 capital expenditures, including principal payments on ínance leases, to be in the range of $135- 145 billion, narrowed from our prior outlook of $130-145 billion."
      },
      {
        "page": 3,
        "label": "차기년도 투자 방향: 정성 근거",
        "text": "Looking beyond 2026, we are still developing our budget and capacity plans for next year, but we expect to continue investing aggressively to support both our core business and emerging AI initiatives. Our current capacity and what is scheduled to come online gives us the îexibility to allocate resources across model training, core business growth, and the development and support of new products. Our AI investments are already delivering substantial incremental advertising revenue through stronger"
      },
      {
        "page": 3,
        "label": "AI 인프라 관련 언급",
        "text": "Our AI investments are already delivering substantial incremental advertising revenue through stronger"
      },
      {
        "page": 8,
        "label": "AI 인프라 관련 언급",
        "text": "Proceeds from data center venture distribution 1,037 - 1,037 -"
      },
      {
        "page": 2,
        "label": "CAPEX 발표 총액",
        "text": "Capital expenditures, including principal payments on finance leases, were $34.91 billion."
      }
    ],
    "importedAt": "2026-11-09T00:00:00.000Z",
    "pages": 10,
    "notes": "2026년 3분기 CAPEX는 33,942M(유형자산 취득) + 964M(금융리스 원금 상환) = 34,906M. 2026년 연간 135~145B 계획은 2027년 축소 여부의 근거가 아니며 2027년에는 공격적 투자 의향만 언급.",
    "seed": true,
    "source": "user-uploaded-pdf"
  },
  {
    "id": "Amazon-2026Q3-filings-verified-20261109",
    "company": "Amazon",
    "period": "2026Q3",
    "year": 2026,
    "quarter": 3,
    "filename": "AMZN-Q3-2026-Earnings-Release.pdf",
    "quarterCapexM": 77259,
    "previousYearCapexM": 35095,
    "ttmCapexM": 215192,
    "quarterHistory": [
      {
        "period": "2026Q3",
        "capexM": 77259,
        "page": 6
      }
    ],
    "yoy": 120.14247043738426,
    "qoq": null,
    "trend": "expanding",
    "capexDefinition": "ppe_cash_purchases_gross",
    "capexDefinitionLabel": "유형자산 취득액(매각대금 차감 전)",
    "currentYearGuidance": {
      "year": 2026,
      "approxB": 220,
      "label": "약 220B USD",
      "page": 4,
      "definition": "현금 CAPEX 가이던스",
      "text": "• We continue to expect 2026 cash capital expenditures to be approximately $220 billion."
    },
    "forwardOutlook": {
      "type": "demand_growth_only",
      "label": "AWS 수요·성장 전망은 있으나 차기년도 CAPEX 미확인",
      "page": 1,
      "text": "2027~2028년 AWS 매출 성장률 전망은 2027년 CAPEX 확대·축소 계획과 동일하지 않습니다.",
      "period": "2027",
      "notNumericCapex": true
    },
    "additional": {
      "ytdCapexM": 175670,
      "cashNetCapexM": 75878
    },
    "guidance": {
      "status": "unknown",
      "text": "차기년도 CAPEX 축소·유지·확대의 명시적 수치/계획을 이 PDF에서 확정하지 못했습니다.",
      "page": null,
      "period": null,
      "auto": true,
      "verified": false
    },
    "confidence": "high",
    "evidence": [
      {
        "page": 6,
        "label": "현금흐름표: 총 유형자산 취득액",
        "text": "Purchases of property and equipment (35,095) (77,259) (92,297) (175,670) (120,131) (215,192)"
      },
      {
        "page": 6,
        "label": "유형자산 매각대금·인센티브",
        "text": "Proceeds from property and equipment sales and incentives 867 1,381 2,446 3,482 4,228 4,535"
      },
      {
        "page": 4,
        "label": "2026년 CAPEX 가이던스",
        "text": "• We continue to expect 2026 cash capital expenditures to be approximately $220 billion."
      },
      {
        "page": 1,
        "label": "차기년도 투자 방향: 정성 근거",
        "text": "2027~2028년 AWS 매출 성장률 전망은 2027년 CAPEX 확대·축소 계획과 동일하지 않습니다."
      },
      {
        "page": 1,
        "label": "AI 인프라 관련 언급",
        "text": "This increase primarily reflects investments in artificial intelligence. This compares to free cash flow inflow of $14.8"
      },
      {
        "page": 3,
        "label": "AI 인프라 관련 언급",
        "text": "• Introduced Built Together, a new $1 billion community investment in U.S. data center communities to provide"
      },
      {
        "page": 1,
        "label": "AI 투자 관련 설명",
        "text": "Free cash flow decreased ... driven primarily by ... purchases of property and equipment ... This increase primarily reflects investments in artificial intelligence."
      }
    ],
    "importedAt": "2026-11-09T00:00:00.000Z",
    "pages": 14,
    "notes": "2026년 3분기 CAPEX는 유형자산 취득액 77,259M(매각·인센티브 차감 전), 차감 후 75,878M. 보고서가 밝힌 약 220B는 2026년 현금 CAPEX 계획이지 2027년 지출 가이던스가 아님.",
    "seed": true,
    "source": "user-uploaded-pdf"
  }
];
