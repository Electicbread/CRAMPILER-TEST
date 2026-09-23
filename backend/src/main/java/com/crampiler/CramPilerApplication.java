package com.crampiler;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Entry point for the CramPiler application (business-logic) tier.
 *
 * @EnableScheduling activates the @Scheduled hourly poller
 *                   (see service.ScheduledPollerService) that keeps assignment
 *                   data
 *                   in sync with the Blackboard .ics feed without a manual
 *                   refresh.
 */
@SpringBootApplication
@EnableScheduling
public class CramPilerApplication {
    public static void main(String[] args) {
        SpringApplication.run(CramPilerApplication.class, args);
    }
}
