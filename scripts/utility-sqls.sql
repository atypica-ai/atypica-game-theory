-- 导出研究和用户信息用于分析
SELECT
	"Analyst".id,
	"Analyst"."userId",
	(
		SELECT
			sum(amount)
		FROM
			"PaymentRecord"
		WHERE
			"userId" = "Analyst"."userId"
			AND status = 'succeeded'
			AND currency = 'USD'
	) AS "usdPaidAmount",
	(
		SELECT
			sum(amount)
		FROM
			"PaymentRecord"
		WHERE
			"userId" = "Analyst"."userId"
			AND status = 'succeeded'
			AND currency = 'CNY'
	) AS "cnyPaidAmount",
	"UserChat"."token" AS "studyUserChatToken",
	'https://atypica.ai/study/' || "UserChat"."token" || '/share?replay=1' AS "replayUrl",
	brief,
	role,
	topic,
	"studySummary",
	"Analyst".kind,
	locale,
	"Analyst"."createdAt"
FROM
	"Analyst"
	INNER JOIN "UserChat" ON "Analyst"."studyUserChatId" = "UserChat".id
ORDER BY
	id DESC
LIMIT
	5000;

-- 统计用户转换付费的时间周期
WITH
	user_first_payment AS (
		SELECT
			u.id AS user_id,
			u."createdAt" AS registration_date,
			MIN(pr."createdAt") AS first_payment_date,
			EXTRACT(
				DAY
				FROM
					(MIN(pr."createdAt") - u."createdAt")
			)::integer AS days_to_first_payment
		FROM
			"User" u
			LEFT JOIN "PaymentRecord" pr ON u.id = pr."userId"
			AND pr.status = 'succeeded'
		WHERE
			u."createdAt" >= '2025-04-01' -- 替换为你想要的开始时间
			AND u."createdAt" < '2025-05-01' -- 替换为你想要的结束时间
			AND u.email IS NOT NULL -- 只统计个人用户，排除团队用户
		GROUP BY
			u.id,
			u."createdAt"
	),
	payment_timing_distribution AS (
		SELECT
			CASE
				WHEN days_to_first_payment IS NULL THEN '未付款'
				WHEN days_to_first_payment <= 1 THEN '≤1天'
				WHEN days_to_first_payment <= 3 THEN '2-3天'
				WHEN days_to_first_payment <= 7 THEN '4-7天'
				WHEN days_to_first_payment <= 14 THEN '8-14天'
				ELSE '≥15天'
			END AS time_period,
			COUNT(*) AS user_count
		FROM
			user_first_payment
		GROUP BY
			CASE
				WHEN days_to_first_payment IS NULL THEN '未付款'
				WHEN days_to_first_payment <= 1 THEN '≤1天'
				WHEN days_to_first_payment <= 3 THEN '2-3天'
				WHEN days_to_first_payment <= 7 THEN '4-7天'
				WHEN days_to_first_payment <= 14 THEN '8-14天'
				ELSE '≥15天'
			END
	)
SELECT
	time_period,
	user_count,
	ROUND(
		(
			user_count * 100.0 / (
				SELECT
					COUNT(*)
				FROM
					user_first_payment
			)
		),
		2
	) AS percentage
FROM
	payment_timing_distribution
ORDER BY
	CASE time_period
		WHEN '≤1天' THEN 1
		WHEN '2-3天' THEN 2
		WHEN '4-7天' THEN 3
		WHEN '8-14天' THEN 4
		WHEN '≥15天' THEN 5
		WHEN '未付款' THEN 6
	END;

-- 工具调用统计
WITH
	"toolInvocations" AS (
		SELECT
			cm.id,
			cm."messageId",
			cm."userChatId",
			cm."createdAt",
			part ->> 'type' AS type,
			part -> 'toolInvocation' ->> 'toolName' AS "toolName"
		FROM
			"ChatMessage" cm,
			jsonb_array_elements(cm.parts::jsonb) AS part
		WHERE
			part ->> 'type' = 'tool-invocation'
			AND (
				part -> 'toolInvocation' ->> 'toolName' LIKE 'xhs%'
				OR part -> 'toolInvocation' ->> 'toolName' LIKE 'dy%'
				OR part -> 'toolInvocation' ->> 'toolName' LIKE 'tiktok%'
				OR part -> 'toolInvocation' ->> 'toolName' LIKE 'ins%'
			)
	)
SELECT
	"toolName",
	COUNT(*) AS "invocationCount",
	COUNT(DISTINCT "userChatId") AS "chatsCount"
FROM
	"toolInvocations"
GROUP BY
	"toolName"
ORDER BY
	"invocationCount" DESC;

-- 分类分研究统计趋势
SELECT
	"userChatId",
	uc.token,
	extra ->> 'reportedBy' AS "reportedBy",
	sum(((extra -> 'reduceTokens') ->> 'originalTokens')::NUMERIC) AS "originalTokens",
	sum(value) AS tokens,
	min(uc."createdAt") AS "createdAt"
FROM
	"ChatStatistics" AS cs
	INNER JOIN "UserChat" AS uc ON uc.id = cs."userChatId"
WHERE
	"dimension" = 'tokens'
GROUP BY
	"userChatId",
	uc.token,
	"reportedBy"
ORDER BY
	"userChatId" DESC
LIMIT
	1200;

-- 总量及单次研究平均
SELECT
	DATE ("createdAt") AS dt,
	sum("value") / count(DISTINCT "userChatId"),
	sum("value"),
	count(DISTINCT "userChatId")
FROM
	"ChatStatistics"
WHERE
	"dimension" = 'tokens'
GROUP BY
	dt
ORDER BY
	dt DESC;

-- 研究平均消耗 Tokens 的日趋势
SELECT
	dt,
	avg(v)
FROM
	(
		SELECT
			DATE (createdAt) AS dt,
			userChatId AS uid,
			sum(value) AS v
		FROM
			ChatStatistics
		WHERE
			dimension = "tokens"
		GROUP BY
			dt,
			userChatId
		ORDER BY
			dt DESC
	) AS g
GROUP BY
	dt
ORDER BY
	dt DESC;
