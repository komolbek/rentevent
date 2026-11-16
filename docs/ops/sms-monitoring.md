# SMS monitoring (RentEvent API)

Where: Railway → RentEvent → **API** → Logs. Logs hold no code, no message text, no key, no full phone, no clear IP. Phone is `+998*******67`; IP only as an 8-hex hash (`ip=`).

## Log lines

```
sms_send purpose=login|admin_reset provider=gateway|mock ok=true|false ms=<latency> msgId=<gateway id or -> status=<see below> phone=<masked>
sms_blocked reason=<see below> purpose=login|admin_reset phone=<masked> [ip=<hash8>]
sms_daily total=<n> cap=<SMS_DAILY_CAP> pct=<50|70|90|100>
```

`sms_send` is one line per provider attempt (success is `info`, failure is `warn`). Sends that never reach the provider appear as `sms_blocked`.

- `status`: `200` (sent), `timeout` (8 s), `network`, `http_429` (gateway throttled), `http_5xx` (gateway down), `http_401`/`http_403`/`http_4xx` (key rejected or request refused), `breaker_open` (30 s pause after 5 failures in a row), `config` (provider not configured), `mock` (dev only). `quota` is reserved, not emitted.
- `reason`: `phone_cooldown` (60 s), `phone_hour`, `phone_day`, `ip_15m`, `ip_day`, `global_daily` (SMS_DAILY_CAP), `breaker_open`, `test_auth` (a cap rejected an App Review test phone). Admin reset phone caps are counted separately from customer ones.
- `sms_daily` fires once per UTC day at 50, 70, 90 and 100 % of `SMS_DAILY_CAP`; 70 % and up are `warn`.
- Counters are in memory per API instance and reset on deploy.

## Railway log searches (paste into the log filter)

| Question | Filter |
|---|---|
| Every send | `sms_send` |
| Failed sends | `sms_send ok=false` |
| Gateway down | `sms_send status=http_5xx` or `sms_send status=timeout` |
| Gateway throttled us | `sms_send status=http_429` |
| Key rejected | `sms_send status=http_401` or `sms_send status=http_403` |
| Breaker tripped | `breaker_open` |
| Slow sends | `@level:warn sms_send` then read `ms=`; p95 target under 5000 |
| Admin resets | `sms_send purpose=admin_reset` |
| Abuse / rejections | `sms_blocked` |
| Pumping one IP | `sms_blocked reason=ip_` |
| Daily volume | `sms_daily` |
| Delivery of one message | `msgId=<id>` (then look it up in the gateway dashboard) |
| Boot refused | `SMS_PROVIDER` or `OTP_PEPPER` |

## Alert rules (manual for now; no monitoring stack)

| Alert | Threshold | Meaning |
|---|---|---|
| Failure ratio | `ok=false` above 10 % of `sms_send` over 15 min, or 5 failures in a row | Gateway/Eskiz down; check `status=` |
| Latency | `ms=` above 5000 on several lines (timeout is 8000) | Gateway or Eskiz slow |
| Daily volume | any `sms_daily` with `pct=70` (act), `90`, `100` (users now get 429) | Pumping or a campaign; raise `SMS_DAILY_CAP` only after checking |
| Rejections | `sms_blocked` above the usual baseline per hour (set it after the first week) | Attack on a phone or IP |
| Admin resets | more than 5 `purpose=admin_reset` per day | Staff are few; investigate |
| Boot | `SMS_PROVIDER` / `OTP_PEPPER` boot error | Config wrong; Railway keeps the old deploy |
| Gateway side | Eskiz balance below the 3-day average spend; delivery rate below 90 % | **Owner** checks the gateway dashboard and the Eskiz balance; not visible from RentEvent logs |

Gateway items G1–G5 (caps deployed, per-project ceilings and low-balance alert, error shape, project/template check, failure alerts) are not implemented here: see `docs/security/sms-readiness-2026-11-16.md`, section "Gateway items". The delivered/not-delivered status of a message exists only in the gateway dashboard.

## Daily check (5 lines)

1. Filter `sms_send ok=false`: none, or a few isolated ones.
2. Filter `sms_daily`: highest `pct` is under 70.
3. Filter `sms_blocked`: no burst from one IP or phone.
4. Gateway dashboard: delivery rate above 90 %.
5. Eskiz balance covers at least 3 days of the average spend.
