package com.sds.devlens.utility;

import org.apache.commons.lang3.StringUtils;

import java.util.Optional;

public class SimpleMethod {

    public static Object getAttributeFromObjectElseEmpty(Object attribute) {
        return Optional.ofNullable(attribute).map(Object::toString).orElse(StringUtils.EMPTY);
    }

    public static String getStringOrDefault(Object value, String defaultValue) {
        return Optional.ofNullable(value).map(Object::toString).orElse(defaultValue);
    }
}
