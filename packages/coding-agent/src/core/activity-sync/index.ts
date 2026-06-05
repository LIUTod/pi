/**
 * Activity sync utilities.
 */

export {
	type ActivitySyncResult,
	type ActivitySyncStatus,
	type SyncSessionAnalyticsOptions,
	syncSessionAnalytics,
} from "./activity-sync.ts";
export {
	ACTIVITY_SYNC_CLIENT_ID,
	ACTIVITY_SYNC_SCOPE,
	ActivitySyncApiError,
	type ActivitySyncApiOptions,
	type ActivitySyncDeviceFlowResponse,
	type ActivitySyncFetch,
	type ActivitySyncTokenResponse,
	type ActivitySyncUploadResponse,
	type ActivitySyncWatermarkResponse,
	DEFAULT_PI_DEV_URL,
	getActivitySyncWatermark,
	pollActivitySyncDeviceToken,
	refreshActivitySyncAccessToken,
	startActivitySyncDeviceFlow,
	type UploadSessionAnalyticsOptions,
	uploadSessionAnalytics,
} from "./api.ts";
export {
	ACTIVITY_SYNC_CONTENT_ENCODING,
	ACTIVITY_SYNC_MAX_COMPRESSED_BYTES,
	ACTIVITY_SYNC_MAX_DECOMPRESSED_BYTES,
	type ActivitySyncPayload,
	type BuildActivitySyncPayloadsOptions,
	buildActivitySyncPayloads,
	compareSessionAnalyticsRecords,
	getSessionAnalyticsRecordTimestamp,
	serializeSessionAnalyticsNdjson,
	sortSessionAnalyticsRecords,
} from "./payload.ts";
export {
	hashSessionAnalyticsString,
	type ProjectSessionAnalyticsOptions,
	type ProjectSessionHeaderAnalyticsOptions,
	projectSessionEntryForAnalytics,
	projectSessionForAnalytics,
	projectSessionHeaderForAnalytics,
	SESSION_ANALYTICS_SCHEMA_VERSION,
	type SessionAnalyticsContentStats,
	type SessionAnalyticsEntryRecord,
	type SessionAnalyticsRecord,
	type SessionAnalyticsSessionRecord,
	type SessionAnalyticsUsage,
} from "./session-analytics.ts";
export {
	type BuildSessionAnalyticsUploadOptions,
	type BuildSessionAnalyticsUploadResult,
	buildSessionAnalyticsUpload,
} from "./session-analytics-reader.ts";
export {
	type DiscoveredSession,
	type DiscoverSessionFilesOptions,
	type DiscoverSessionsOptions,
	discoverSessionFiles,
	discoverSessions,
	type SessionDiscoveryPhase,
	type SessionDiscoveryProgress,
	type SessionDiscoveryProgressCallback,
} from "./session-discovery.ts";
export {
	type ActivitySyncLockResult,
	type ActivitySyncState,
	type ActivitySyncStatePaths,
	getActivitySyncStatePaths,
	getStableActivitySyncDeviceId,
	loadActivitySyncState,
	saveActivitySyncState,
	updateActivitySyncState,
	withActivitySyncLock,
} from "./state.ts";
