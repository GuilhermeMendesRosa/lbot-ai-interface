#ifndef ENKISOCKETCONTROL_H
#define ENKISOCKETCONTROL_H

#include <viewer/Viewer.h>
#include <enki/PhysicalEngine.h>
#include <enki/robots/e-puck/EPuck.h>
#include <QApplication>
#include <QTcpServer>
#include <QTcpSocket>
#include <QTimer>
#include <QtGui>

using namespace Enki;

class SocketControlExample : public ViewerWidget
{
    Q_OBJECT
    
protected:
    EPuck* robot;
    QTcpServer* server;
    QTcpSocket* clientSocket;
    QTimer* statusTimer;
    int stepCounter;
    bool verbose;
    
    // Sistema de movimento por distância
    bool isMoving;
    double targetDistance;
    double currentDistance;
    Point startPosition;
    double startAngle;
    QString currentMovementType;
    double pendingMoveDistance; // Para armazenar distância após rotação
    
    // Variáveis para tracking de rotação
    double accumulatedRotation;
    double lastAngle;
    
    // Fila de comandos para execução sequencial
    QStringList commandQueue;
    bool executingQueue;
    
public:
    SocketControlExample(World *world, QWidget *parent = 0);
    ~SocketControlExample();
    
    void setupRobot(World* world);
    void setupTcpServer();
    virtual void timerEvent(QTimerEvent * event);
    void processCommand(const QString& command);
    void sendResponse(const QString& message);
    void sendRobotStatus();
    void executeMovementSequence(const QStringList& movements);
    void executeNextCommand();
    void executeSingleCommand(const QString& movement);
    void checkMovementProgress();
    void stopRobot();
    void resetRotationTracking();
    
public slots:
    void onNewConnection();
    void onDataReceived();
    void onClientDisconnected();
    void sendStatus();
};

#endif // ENKISOCKETCONTROL_H
