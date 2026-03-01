# Changelog

## 2026-03-01 | 결제 요약(billingSummary) 계산 로직 수정

- **billingDay >= 15일 때 결제 기간이 한 달씩 밀려서 표시되는 버그 수정**: "전월 실적 = 당월 결제" 고정 가정 대신, `getBillingMonthKey` 함수로 각 실적 기간의 실제 결제월을 정확히 판별하도록 변경
- **결제 요약에서 청구 제외(exclude_from_billing) 거래 필터링 추가**: 취소/환불 등 실제 결제되지 않는 거래가 결제 예정액에 포함되던 문제 수정
- 수정 파일: `src/app/api/dashboard/route.ts`
- 카드 실적 계산, 이전 실적 표시, 이월잔액 로직은 변경 없음
