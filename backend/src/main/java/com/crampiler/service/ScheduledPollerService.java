package com.crampiler.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Runs BlackboardSyncService automatically on a fixed interval so new
 * deadlines or date changes appear without the student manually refreshing.
 * Interval is configurable via application.properties (default: hourly).
 */
@Service
public class ScheduledPollerService {

    private static final Logger log = LoggerFactory.getLogger(ScheduledPollerService.class);

    private final BlackboardSyncService blackboardSyncService;

    @Value("${crampiler.blackboard.ics-url:}")
    private String configuredIcsUrl;

    public ScheduledPollerService(BlackboardSyncService blackboardSyncService) {
        this.blackboardSyncService = blackboardSyncService;
    }

    @Scheduled(fixedRateString = "${crampiler.sync.interval-ms:3600000}") // default: 1 hour
    public void pollBlackboardFeed() {
        if (configuredIcsUrl == null || configuredIcsUrl.isBlank()) {
            log.debug("No Blackboard .ics URL configured yet; skipping scheduled sync.");
            return;
        }
        try {
            int count = blackboardSyncService.syncFromFeed(configuredIcsUrl);
            log.info("Scheduled Blackboard sync complete: {} assignments processed.", count);
        } catch (Exception e) {
            log.warn("Scheduled Blackboard sync failed: {}", e.getMessage());
        }
    }
}
