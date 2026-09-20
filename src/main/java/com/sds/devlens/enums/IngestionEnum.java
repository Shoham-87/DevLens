package com.sds.devlens.enums;

public enum IngestionEnum {

     HEALTH("HEALTH"),
     INGEST("INGEST");

    private final String ingestionValue;

    IngestionEnum(String ingestionValue) {
        this.ingestionValue = ingestionValue;
    }
    public String getIngestionValue(){
        return ingestionValue;
    }
}
