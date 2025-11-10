package com.cronya.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "baidu.map")
public class BaiduMapConfig {

    public static class ServerConfig {
        private String ak;

        public void setAk(String ak) {
            this.ak = ak;
        }

        public String getAk() {
            return ak;
        }
    }

    public static class DrivingConfig {
        private String url;

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }
    }

    private ServerConfig server = new ServerConfig();

    private DrivingConfig driving = new DrivingConfig();

    public ServerConfig getServer() {
        return server;
    }

    public void setServer(ServerConfig server) {
        this.server = server;
    }

    public DrivingConfig getDriving() {
        return driving;
    }

    public void setDriving(DrivingConfig driving) {
        this.driving = driving;
    }
}
