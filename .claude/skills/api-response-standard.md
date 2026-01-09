---
name: api-response-standard
description: API 표준 응답 형식 명세. success/code/message/response 필드를 가진 표준 응답 envelope 패턴을 따르는 API 작업 시 사용. 응답 DTO 파싱, 에러 응답 처리, List 기반 API 응답 작업 시 참고.
---

# API 응답 표준

## 개요

애플리케이션 전체에서 사용하는 표준 API 응답 형식을 정의합니다. 모든 API 엔드포인트는 성공 여부, 상태 코드, 메시지, 실제 응답 데이터를 포함하는 일관된 envelope 구조로 응답을 반환합니다.

## 응답 형식

### 정상 응답

```json
{
    "success": true,
    "code": "20000",
    "message": "정상 처리되었습니다.",
    "response": <실제 데이터>
}
```

### 오류 응답

```json
{
    "success": false,
    "code": "40100",
    "message": "인증정보가 존재하지않습니다.",
    "response": null
}
```

### 응답 필드

- **success** (boolean): 요청 성공 여부
  - `true`: 요청이 정상 처리됨 (code: "20000")
  - `false`: 요청이 오류로 실패함
- **code** (string): 응답 상태 코드
  - "20000": 성공
  - "40100", "40400", "50000" 등: 각종 오류 코드
- **message** (string): 결과를 설명하는 사람이 읽을 수 있는 메시지
- **response**: 실제 응답 데이터 (오류 또는 일부 성공 케이스에서는 null일 수 있음)

## 응답 데이터 패턴

### 단일 객체 응답

다음과 같은 DTO 필드가 제공될 때:
```
private String sector;
private String industries;
```

응답의 `response` 필드에 단일 객체가 포함됩니다:
```json
{
    "success": true,
    "code": "20000",
    "message": "정상 처리되었습니다.",
    "response": {
        "sector": "Technology",
        "industries": "Software"
    }
}
```

### List 응답

"List로 감싸진 형태"로 명시된 경우, 응답의 `response` 필드에 배열이 포함됩니다:
```json
{
    "success": true,
    "code": "20000",
    "message": "정상 처리되었습니다.",
    "response": [
        {
            "sector": "Technology",
            "industries": "Software"
        },
        {
            "sector": "Healthcare",
            "industries": "Pharmaceuticals"
        }
    ]
}
```

## 응답 처리 가이드라인

### 응답 파싱

1. 먼저 `success` 필드 확인
2. `success`가 `true`이면, `response` 필드에서 데이터 추출
3. `success`가 `false`이면, `code`와 `message`를 사용하여 에러 처리

### 응답 바디 존재 여부

- 응답 바디(`response` 필드)는 성공 및 오류 케이스 모두에서 존재할 수도 있고 null일 수도 있음
- `response` 데이터에 접근하기 전에 항상 null 체크 필요

### TypeScript/JavaScript 예시

```typescript
interface ApiResponse<T> {
    success: boolean;
    code: string;
    message: string;
    response: T | null;
}

// 단일 객체
interface SectorDto {
    sector: string;
    industries: string;
}

// 사용법
const result: ApiResponse<SectorDto> = await api.getSector();
if (result.success && result.response) {
    console.log(result.response.sector);
}

// List
const listResult: ApiResponse<SectorDto[]> = await api.getSectors();
if (listResult.success && listResult.response) {
    listResult.response.forEach(item => console.log(item.sector));
}
```

### Java 예시

```java
public class ApiResponse<T> {
    private boolean success;
    private String code;
    private String message;
    private T response;
}

// 단일 객체
ApiResponse<SectorDto> result = apiService.getSector();
if (result.isSuccess() && result.getResponse() != null) {
    System.out.println(result.getResponse().getSector());
}

// List
ApiResponse<List<SectorDto>> listResult = apiService.getSectors();
if (listResult.isSuccess() && listResult.getResponse() != null) {
    listResult.getResponse().forEach(dto -> 
        System.out.println(dto.getSector())
    );
}
```

## 다른 스킬과의 통합

이 표준은 프로젝트별 스킬(예: comp-value-admin-v2)에 다음 방식으로 통합 가능:

1. **참조 방식**: 프로젝트 스킬에 이 api-response-standard 스킬을 참조하도록 메모 추가
2. **병합 방식**: 관련 섹션을 프로젝트 스킬의 API 문서에 직접 복사

병합 시 포함할 내용:
- 응답 형식 구조
- DTO 파싱 가이드라인
- 에러 처리 패턴