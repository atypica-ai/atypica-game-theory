-- Rename UserPoints table to UserTokens
RENAME TABLE `UserPoints` TO `UserTokens`;

-- Rename UserPointsLog table to UserTokensLog
RENAME TABLE `UserPointsLog` TO `UserTokensLog`;

-- Rename column 'points' to 'value' in UserTokensLog
ALTER TABLE `UserTokensLog` CHANGE COLUMN `points` `value` INTEGER NOT NULL;

-- Drop and recreate foreign key constraints with new names
ALTER TABLE `UserTokens`
DROP FOREIGN KEY `UserPoints_userId_fkey`,
ADD CONSTRAINT `UserTokens_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `UserTokensLog`
DROP FOREIGN KEY `UserPointsLog_userId_fkey`,
ADD CONSTRAINT `UserTokensLog_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rename indexes if they exist (first check and drop if they exist)
ALTER TABLE `UserTokens`
RENAME INDEX `UserPoints_userId_key`
TO `UserTokens_userId_key`;

ALTER TABLE `UserTokensLog`
RENAME INDEX `UserPointsLog_userId_verb_idx`
TO `UserTokensLog_userId_verb_idx`;

ALTER TABLE `UserTokensLog`
RENAME INDEX `UserPointsLog_userId_verb_resourceType_resourceId_idx`
TO `UserTokensLog_userId_verb_resourceType_resourceId_idx`;
