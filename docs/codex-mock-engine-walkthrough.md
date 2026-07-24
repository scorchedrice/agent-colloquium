# Codex Mock Engine 실행 기록

이 문서는 Codex project skill `agent-colloquium`을 직접 실행한 한 번의 기록이다. 목표는 현재 engine이 어떤 순서로 움직이고, 어느 부분이 구현된 mock이며 어느 부분이 미래 구현 과제인지를 눈으로 확인하는 것이다.

## 1. 실행한 입력

입력 파일: [`fixtures/generic-research/problem.json`](../fixtures/generic-research/problem.json)

```json
{
  "question": "How should a small team evaluate a generic sensor idea?",
  "goals": ["produce a safe first experiment plan"],
  "constraints": ["no external provider calls"]
}
```

실행 명령:

```bash
pnpm colloquium:run -- \
  --input fixtures/generic-research/problem.json \
  --output .runs/codex-mock-engine-walkthrough \
  --provider mock
```

실행은 성공했고, `.runs/codex-mock-engine-walkthrough/`에 `artifact.json`과 `report.md`를 만들었다. `.runs/`는 local-only 실행 기록으로 Git에서 제외된다.

## 2. 실행 흐름

```text
JSON input
  → CLI option allowlist와 input 검증
  → deterministic mock panel 생성
  → cross-examination 생성
  → branch decision 부여
  → unresolved disagreement + synthesis 생성
  → artifact.json / report.md 저장
```

### 단계 A — CLI가 안전한 실행 요청인지 확인

[`src/cli.ts`](../src/cli.ts)는 `--input`, `--output`, `--provider`만 받는다. 모르는 옵션, 중복 옵션, 누락 옵션, `mock` 이외 provider는 output directory를 만들기 전에 오류로 끝난다. 그런 다음 JSON을 읽어 `question`, `goals`, `constraints` 형태를 확인한다.

이 run에서 `--provider mock`을 명시했으므로 network, model SDK, credential은 전혀 사용하지 않았다.

### 단계 B — 입력을 `ResearchProblem`으로 정규화

`validateProblem()`은 빈 질문을 거부하고 `goals`와 `constraints`가 string array인지 확인한다. 현재는 코드 내부 TypeScript type과 수동 validation을 사용한다. 다음 schema task에서는 이를 공개 runtime schema로 확장한다.

### 단계 C — 네 개의 독립 position을 만든다

`runMockColloquium()`은 같은 문제를 네 관점으로 기록한다.

| 역할 | 이 run에서 생성한 핵심 주장 | 남긴 unknown |
|---|---|---|
| Domain Analyst | 먼저 반증 가능한 pilot hypothesis를 만든다. | 어떤 metric이 성공을 뜻하는가? |
| Evidence Reviewer | 외부 근거가 없으므로 인과 결론을 받아들이지 않는다. | 어떤 source 또는 measurement가 필요한가? |
| Feasibility Reviewer | 제약 아래에서는 큰 구현보다 작은 pilot이 낫다. | 실제 자원과 시간은 얼마인가? |
| Contrarian | positive result가 confounder 탓일 수 있다. | 가장 위험한 confounder는 무엇인가? |

각 position은 `claim`, `evidence`, `assumptions`, `unknowns`, `proposedNextStep`을 갖는다.

> **현재의 정확한 의미:** `isIndependent: true`는 protocol contract다. 이 MVP는 네 개의 실제 Codex subagent를 병렬 실행하지 않는다. `src/engine.ts`의 고정 mock template가 네 position을 결정론적으로 생성한다. 미래 runner가 구현되면 이 위치가 각 agent에 서로의 결과를 보이지 않고 요청을 보내는 경계가 된다.

### 단계 D — cross-examination을 기록한다

position을 만든 뒤 네 개의 질문을 만든다. 예를 들어 Evidence Reviewer는 Domain Analyst에게 “매력적이지만 근거 없는 설명과 pilot hypothesis를 어떤 증거로 구별할 것인가?”라고 묻는다.

이 단계의 목적은 찬성 주장만 쌓지 않고, evidence·control·자원·대안 설명에 대한 압력을 남기는 것이다. 현재 질문도 mock template이며, 미래에는 validated position을 받은 runner가 생성한다.

### 단계 E — claim을 삭제하지 않고 상태를 부여한다

이 run의 상태는 다음과 같다.

| 상태 | 대상 | 이유 |
|---|---|---|
| `survives` | 반증 가능한 pilot을 먼저 정의한다. | 주어진 제약과 양립한다. |
| `needs-evidence` | 인과 결론을 받아들이지 않는다. | source 또는 measurement가 아직 없다. |
| `survives` | 작은 reversible pilot을 선호한다. | 자원 정보가 없을 때 commitment를 줄인다. |
| `needs-evidence` | confounder 가능성을 검토한다. | 통제하려면 구체적인 confounder를 먼저 정해야 한다. |

`needs-evidence`는 “틀렸다”가 아니다. 다음 evidence를 확보하기 전까지 결론을 보류한다는 뜻이다.

### 단계 F — 합의와 이견을 함께 내보낸다

모든 position을 하나로 덮어쓰지 않는다. 이번 run은 “pilot을 준비한다”에는 합의했지만, **evidence 확보와 resource discovery 중 무엇이 첫 병목인지**는 알 수 없다고 남겼다.

최종 synthesis는 다음의 다음 행동을 제시한다.

```text
성공 metric, control condition, evidence-acquisition checklist를 갖춘
reversible pilot을 준비한다. 대안 설명의 control이 생기기 전에는
인과관계를 결론내리지 않는다.
```

### 단계 G — 검토용 artifact를 저장한다

- `artifact.json`: role, claim, evidence, unknown, cross-examination, decision, disagreement를 기계적으로 다시 읽을 수 있는 기록
- `report.md`: 사람이 빠르게 검토하는 같은 내용의 Markdown 표현

동일 input은 동일 `artifact.json`을 만든다. timestamp, UUID, random number, provider output이 없기 때문이다.

## 3. 현재 동작과 다음 구현의 경계

| 현재 동작 | 아직 구현하지 않은 것 |
|---|---|
| deterministic mock CLI가 안전한 local command를 제공 | model provider integration 또는 provider-agnostic PanelRunner |
| input validation과 option allowlist | Zod 등 공개 runtime schema |
| 고정 mock position·반론·결정·synthesis | 입력에 따라 생성되는 provider-independent PanelRunner |
| deterministic JSON/Markdown artifact | evidence quality와 testability를 이용한 규칙 기반 score/pruning |
| 이견을 남기는 output shape | deterministic CLI 안에서의 실제 multi-agent isolation과 cross-examination 생성 |

따라서 이 mock run은 “다중 agent가 이미 실제로 심의했다”는 증거가 아니라, 실제 runner가 만족해야 할 **입력·상태·artifact 흐름을 안전하게 직접 실행한 증거**다. 실제 native Codex runner는 installable plugin bundle의 `agent-colloquium` skill에 별도로 정의되어 있으며, provider 호출 없이 격리 role과 fresh synthesis context를 사용한다.

## 4. 사람이 수정할 때 볼 파일 순서

1. [`src/cli.ts`](../src/cli.ts) — 어떤 실행 요청을 받고 어디에 쓸지
2. [`src/engine.ts`](../src/engine.ts) — input에서 artifact까지의 protocol state
3. [`test/cli.integration.test.mjs`](../test/cli.integration.test.mjs) — 유지해야 할 observable behavior
4. [`plugins/agent-colloquium/skills/agent-colloquium/SKILL.md`](../plugins/agent-colloquium/skills/agent-colloquium/SKILL.md) — 설치 가능한 Codex plugin이 native role runner를 어떻게 안내하는지
5. [`docs/typescript-engine-구현계획.md`](./typescript-engine-구현계획.md) — mock 이후의 schema, policy, runner, adapter 순서
