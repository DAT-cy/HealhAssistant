# Phase 2 - Planning

## Scope

- Tạo profile và health constraints.
- Roadmap schema gồm phases, weeks, goals, progression và safety notes.
- Daily plan gồm exercises, sets/reps, calories, macros và meals.
- Rule engine kiểm tra BMR/TDEE; LLM chỉ làm nhiệm vụ đề xuất có cấu trúc.

## Done criteria

- JSON schema versioned và reject output không hợp lệ.
- Có fallback plan khi LLM timeout hoặc trả dữ liệu lỗi.
- Cache menu mẫu để giảm latency/token cost.
- Có prompt version, model version và trace cho mỗi kế hoạch được sinh.
- Có kiểm thử hallucination, unsafe advice và output không đúng schema.
