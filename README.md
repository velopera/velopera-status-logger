# VELOpera Status Logger

## Overview

This project developed to handle device data, communication, and logging. It integrates with MariaDB for device information storage, MQTT for real-time communication and InfluxDB for storing temperature data. The system utilizes a modular structure with clear separation of concerns for ease of maintenance and scalability.

## Database Interaction

The db.ts module manages interactions with MariaDB. It includes a method to fetch device information from the database.

## MQTT Communication

The system communicates with IoT devices using the MQTT protocol. The MQTTService.ts class establishes and manages the connection, while the MQTTController.ts class handles MQTT events and delegates messages to specific devices.

## InfluxDB Integration

Temperature data from IoT devices is stored in InfluxDB. The InfluxDBService.ts class provides methods to write temperature data to the InfluxDB database. device.ts class provides method to handle which message to listen, by duplicating the if condition with if else, you can specify which message you want to listen to and have it write this message to influxdb.

## Logging

The system utilizes Winston for logging. The logger.ts module configures logging and daily rotating log files.

## Project Files:

### .env

The .env file is used for configuring environment variables, providing a flexible way to manage settings for your application. It includes configurations for MariaDB (MySQL), MQTT broker, InfluxDB, and the logger.

### app.ts

This is the main entry point of your application. It initializes the application by fetching devices from the database and then creates an instance of the MQTTController with the retrieved devices.

### db.ts

This module handles the interaction with the MySQL database. It uses the mysql2 library to create a connection pool and includes a method (getDevices) to fetch devices from the database.

### device.ts

The Device class represents an IoT device. It includes methods to handle MQTT messages, extracting information from the message topic and payload. Additionally, it interacts with the InfluxDB service to write temperature data.

### InfluxDBService.ts

This service class communicates with InfluxDB, a time-series database. It includes a method (writeToInflux) to write data (temperature readings) to InfluxDB.

### MQTTService.ts

This service class manages the communication with the MQTT broker. It connects to the broker, subscribes to topics, and handles various events such as connection, disconnection, and message reception.

### MQTTController.ts

The MQTTController class acts as a controller for MQTT communication. It initializes the MQTT service, subscribes to relevant topics, and delegates message handling to specific devices based on their IMEI.

### logger.ts

The logger module configures the Winston logging library. It creates a logger instance with transports for both the console and daily rotating log files. Log messages include timestamps and are colorized for readability.

## Installation

```bash
cd velopera-status-logger
npm i
```

## Configuration

### .env Configuration

**MariaDB Configuration:**

**DB_HOST**: MySQL database host.
**DB_USER**: MySQL database username.
**DB_PASS**: MySQL database password.
**DB_NAME**: MySQL database name.

**MQTT Configuration**:

**MQTT_HOST**: MQTT broker host.
**MQTT_PORT**: MQTT broker port.
**MQTT_USER**: MQTT username.
**MQTT_PASS**: MQTT password.

**InfluxDB Configuration**:

**INFLUXDB_HOST**: InfluxDB host.
**INFLUXDB_PORT**: InfluxDB port.
**INFLUXDB_NAME**: InfluxDB database name.

**Logger Configuration**:

**LOG_PREFIX**: Prefix for log files.

## Usage

```bash
npm start
```
