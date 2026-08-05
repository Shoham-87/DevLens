package com.sds.devlens.enums;

public enum ConnectedRepoStatus {

    PENDING("PENDING"),
    INDEXING("INDEXING"),
    READY("READY"),
    FAILED("FAILED");

    private final String statusValue;

    ConnectedRepoStatus(String statusValue) {
        this.statusValue=statusValue;
    }
    public String getStatus() {
        return statusValue;
    }
}
