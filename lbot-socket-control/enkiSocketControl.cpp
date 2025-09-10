#include "enkiSocketControl.h"
#include <iostream>
#include <sstream>
#include <string>

/*
    Arquivo: enkiSocketControl.cpp

    Objetivo: Este arquivo implementa uma pequena aplicação de visualização
    e controle de um robô (EPuck) usando a biblioteca Enki e um servidor TCP
    (QTcpServer). O programa aceita comandos via socket para mover o robô.

    Comentários gerais (explicação para quem não conhece C++ / Enki):
    - A classe principal é `SocketControlExample`, que herda de `ViewerWidget`
        (um componente gráfico da Enki). Essa classe cria o robô no mundo,
        inicia um servidor TCP e escuta por comandos de controle.
    - Comandos recebidos são strings simples (ex: "10F;5R") e a lógica faz
        parsing dessas strings e enfileira/execulta movimentos sequenciais.
    - O controle de movimento é feito ajustando `leftSpeed` e `rightSpeed`
        do objeto `EPuck` e monitorando a posição/ângulo para parar quando
        o alvo foi alcançado.

    Como usar (resumo):
    - Compile o projeto via CMake (o repositório já possui CMakeLists.txt).
    - Rode o executável. Uma janela gráfica aparecerá e o servidor TCP
        escutará na porta 9999.
    - Conecte-se via telnet/nc e envie comandos do tipo: "10F;90R;5B" ou
        comandos literais: "stop", "status", "quit".

    Observação: Os comentários neste arquivo foram adicionados para ajudar
    na apresentação oral do funcionamento do código.
*/

using namespace std;

SocketControlExample::SocketControlExample(World *world, QWidget *parent) :
    ViewerWidget(world, parent),
    robot(nullptr),
    server(nullptr),
    clientSocket(nullptr),
    stepCounter(0),
    verbose(true),
    isMoving(false),
    targetDistance(0.0),
    currentDistance(0.0),
    startPosition(0, 0),
    startAngle(0.0),
    currentMovementType(""),
    pendingMoveDistance(0.0),
    executingQueue(false),
    accumulatedRotation(0.0),
    lastAngle(0.0)
{
    // Inicializa e posiciona o robô no mundo da simulação
    setupRobot(world);

    // Configura o servidor TCP que receberá comandos externos
    setupTcpServer();

    // Timer periódico usado para enviar status (a cada 1 segundo)
    statusTimer = new QTimer(this);
    connect(statusTimer, &QTimer::timeout, this, &SocketControlExample::sendStatus);
    statusTimer->start(1000);

    // Mensagens informativas para terminal (úteis durante demonstração)
    cout << "=== Controle via Socket - Enki ===" << endl;
    cout << "Servidor TCP rodando na porta 9999" << endl;
    cout << "Conecte um cliente para controlar o robô" << endl;
    cout << "Comandos: XF;YB;ZL;WR (ex: 10F;5R), stop, status, quit" << endl;
}

void SocketControlExample::setupRobot(World* world)
{
    // Cria uma instância do robô (EPuck) e define posição inicial e cor
    robot = new EPuck;
    robot->pos = Point(60, 60); // posição inicial no mundo (x, y)
    robot->angle = 0; // orientação inicial (radianos)
    robot->setColor(Color(0.2, 0.7, 0.2));

    // Velocidades iniciais das rodas (simulação)
    robot->leftSpeed = 0.0;
    robot->rightSpeed = 0.0;

    // Adiciona o robô ao mundo para que ele seja renderizado e simulado
    world->addObject(robot);

    if (verbose) {
        cout << "Robô criado em (" << robot->pos.x << ", " << robot->pos.y << ")" << endl;
    }
}

void SocketControlExample::setupTcpServer()
{
    server = new QTcpServer(this);
    // Quando um cliente novo conectar, onNewConnection() será chamado
    connect(server, &QTcpServer::newConnection, this, &SocketControlExample::onNewConnection);

    // Tenta começar a escutar na porta 9999 em todas as interfaces
    if (!server->listen(QHostAddress::Any, 9999)) {
        cout << "Erro: Não foi possível iniciar o servidor TCP: " 
             << server->errorString().toStdString() << endl;
    } else {
        cout << "Servidor TCP iniciado na porta 9999" << endl;
    }
}

void SocketControlExample::timerEvent(QTimerEvent * event)
{
    stepCounter++;
    // Chamado a cada 'tick' do framework (atualiza simulação/visualização)
    if (isMoving) {
        // Verifica se o movimento atual já atingiu o alvo
        checkMovementProgress();
    }

    // Mensagem informativa periódica para debug (cada 500 passos)
    if (verbose && stepCounter % 500 == 0) {
        cout << "Passo " << stepCounter << " - Posição: (" 
             << robot->pos.x << ", " << robot->pos.y 
             << ") Ângulo: " << robot->angle << endl;
    }

    // Chama a implementação base para manter comportamento padrão do ViewerWidget
    ViewerWidget::timerEvent(event);
}

void SocketControlExample::processCommand(const QString& command)
{
    QString cmd = command.trimmed();
    
    // Comandos literais simples: status, quit, stop
    if (cmd.toLower() == "status") {
        sendRobotStatus();
        return;
    } else if (cmd.toLower() == "quit") {
        sendResponse("OK: Goodbye!");
        QApplication::quit();
        return;
    } else if (cmd.toLower() == "stop") {
        // Para o robô imediatamente e limpa fila de comandos
        stopRobot();
        commandQueue.clear();
        executingQueue = false;
        sendResponse("OK: Robot stopped and command queue cleared");
        return;
    }

    // Comandos compostos (sequência), separados por ';'
    QStringList movements = cmd.split(';', Qt::SkipEmptyParts);
    if (movements.isEmpty()) {
        sendResponse("ERROR: Invalid command format. Use: XF;YB;ZL;WR (e.g., 10F;5R)");
        return;
    }

    // Enfileira e executa a sequência de movimentos (ver executeMovementSequence)
    executeMovementSequence(movements);

    if (verbose) {
        cout << "Comando executado: " << command.toStdString() << endl;
    }
}

void SocketControlExample::sendResponse(const QString& message)
{
    if (clientSocket && clientSocket->state() == QTcpSocket::ConnectedState) {
        clientSocket->write((message + "\n").toUtf8());
        clientSocket->flush();
    }
}

void SocketControlExample::sendRobotStatus()
{
    QString status = QString("STATUS: pos=(%1,%2) angle=%3 left_speed=%4 right_speed=%5")
                    .arg(robot->pos.x, 0, 'f', 2)
                    .arg(robot->pos.y, 0, 'f', 2)
                    .arg(robot->angle, 0, 'f', 2)
                    .arg(robot->leftSpeed, 0, 'f', 2)
                    .arg(robot->rightSpeed, 0, 'f', 2);
    sendResponse(status);
}

void SocketControlExample::executeMovementSequence(const QStringList& movements)
{
    if (movements.isEmpty()) {
        sendResponse("ERROR: No movements provided");
        return;
    }
    
    if (isMoving) {
        for (const QString& movement : movements) {
            if (!movement.trimmed().isEmpty()) {
                commandQueue.append(movement.trimmed());
            }
        }
        sendResponse(QString("INFO: Added %1 commands to queue").arg(movements.size()));
        return;
    }
    
    commandQueue.clear();
    for (const QString& movement : movements) {
        if (!movement.trimmed().isEmpty()) {
            commandQueue.append(movement.trimmed());
        }
    }
    
    executingQueue = true;
    executeNextCommand();
}

void SocketControlExample::executeNextCommand()
{
    if (commandQueue.isEmpty()) {
        executingQueue = false;
        sendResponse("OK: All commands completed");
        return;
    }
    
    QString movement = commandQueue.takeFirst();
    executeSingleCommand(movement);
}

void SocketControlExample::executeSingleCommand(const QString& movement)
{
    const double DEFAULT_SPEED = 5.0;
    
    if (movement.isEmpty()) {
        executeNextCommand();
        return;
    }
    
    QString cleanMove = movement.trimmed().toUpper();
    if (cleanMove.length() < 2) {
        sendResponse("ERROR: Invalid movement format: " + movement);
        executeNextCommand();
        return;
    }
    
    // Determina se é comando de rotação (prefixo 'R') ou deslocamento ('D' ou sem prefixo)
    bool isRotationCommand = false;
    bool isDisplacementCommand = false;

    // Último caractere indica a direção (ex: F, B, L, R)
    QChar direction = cleanMove.right(1)[0];
    // O restante contém número e possivelmente um prefixo (R ou D)
    QString numberStr = cleanMove.left(cleanMove.length() - 1);

    // Verifica se há um prefixo (letra) antes do número
    if (!numberStr.isEmpty() && numberStr[0].isLetter()) {
        QChar prefix = numberStr[0];
        if (prefix == 'R') {
            isRotationCommand = true;
        } else if (prefix == 'D') {
            isDisplacementCommand = true;
        }
        // Remove o prefixo para obter apenas o valor numérico
        numberStr = numberStr.mid(1);

        if (verbose) {
            cout << "Executando comando - Prefixo: " << prefix.toLatin1() << ", número: " << numberStr.toStdString() << ", direção: " << direction.toLatin1() << endl;
        }
    } else {
        // Se não há prefixo explícito, assumimos deslocamento (ex: 10F)
        isDisplacementCommand = true;
    }

    // Converte número para double (distância em unidades da simulação ou graus)
    bool ok;
    double distance = numberStr.toDouble(&ok);
    if (!ok || distance < 0) {
        sendResponse("ERROR: Invalid distance in movement: " + movement + " (parsed: " + numberStr + ")");
        executeNextCommand();
        return;
    }

    // Se já existe um movimento em execução, pare-o antes de iniciar outro
    if (isMoving) {
        stopRobot();
    }

    // --- Tratamento de rotação ---
    if (isRotationCommand) {
        // Guardamos o ângulo inicial e convertemos graus para radianos
        startAngle = robot->angle;
        targetDistance = distance * M_PI / 180.0; // alvo em radianos
        currentDistance = 0.0;
        isMoving = true;

        switch (direction.toLatin1()) {
            case 'L':
                currentMovementType = "rotate_left";
                // Rotação no sentido anti-horário: ajusta velocidades das rodas
                robot->leftSpeed = -DEFAULT_SPEED * 0.6;
                robot->rightSpeed = DEFAULT_SPEED * 0.6;
                sendResponse(QString("OK: Rotating left %1 degrees").arg(distance, 0, 'f', 1));
                break;
            case 'R':
                currentMovementType = "rotate_right";
                robot->leftSpeed = DEFAULT_SPEED * 0.6;
                robot->rightSpeed = -DEFAULT_SPEED * 0.6;
                sendResponse(QString("OK: Rotating right %1 degrees").arg(distance, 0, 'f', 1));
                break;
            default:
                sendResponse("ERROR: Invalid rotation direction '" + QString(direction) + "'. Use L or R for rotation");
                return;
        }

        // Reinicia variáveis usadas para rastrear a rotação acumulada
        resetRotationTracking();

    // --- Tratamento de deslocamento ---
    } else if (isDisplacementCommand) {
        switch (direction.toLatin1()) {
            case 'F': // andar para frente
                startPosition = robot->pos;
                targetDistance = distance; // usa a mesma unidade que a simulação
                currentDistance = 0.0;
                isMoving = true;
                currentMovementType = "forward";

                robot->leftSpeed = DEFAULT_SPEED;
                robot->rightSpeed = DEFAULT_SPEED;

                sendResponse(QString("OK: Moving forward for %1 units").arg(distance, 0, 'f', 1));
                break;

            case 'B': // andar para trás
                startPosition = robot->pos;
                targetDistance = distance;
                currentDistance = 0.0;
                isMoving = true;
                currentMovementType = "backward";

                robot->leftSpeed = -DEFAULT_SPEED;
                robot->rightSpeed = -DEFAULT_SPEED;

                sendResponse(QString("OK: Moving backward for %1 units").arg(distance, 0, 'f', 1));
                break;

            case 'L': // virar 90° à esquerda e depois mover (padrão do código)
                startAngle = robot->angle;
                targetDistance = M_PI / 2; // 90 graus em radianos
                currentDistance = 0.0;
                isMoving = true;
                currentMovementType = "turn_left_then_move";
                pendingMoveDistance = distance; // distância a percorrer após giro

                robot->leftSpeed = -DEFAULT_SPEED * 0.6;
                robot->rightSpeed = DEFAULT_SPEED * 0.6;

                resetRotationTracking();

                sendResponse(QString("OK: Turning left 90° then moving %1 units").arg(distance, 0, 'f', 1));
                break;

            case 'R': // virar 90° à direita e depois mover
                startAngle = robot->angle;
                targetDistance = M_PI / 2;
                currentDistance = 0.0;
                isMoving = true;
                currentMovementType = "turn_right_then_move";
                pendingMoveDistance = distance;

                robot->leftSpeed = DEFAULT_SPEED * 0.6;
                robot->rightSpeed = -DEFAULT_SPEED * 0.6;

                resetRotationTracking();

                sendResponse(QString("OK: Turning right 90° then moving %1 units").arg(distance, 0, 'f', 1));
                break;

            default:
                sendResponse("ERROR: Invalid displacement direction '" + QString(direction) + "'. Use F, B, L, R");
                executeNextCommand();
                return;
        }
    } else {
        sendResponse("ERROR: Unknown command type for: " + movement);
        executeNextCommand();
        return;
    }
}

void SocketControlExample::checkMovementProgress()
{
    if (!isMoving) return;
    
    const double DEFAULT_SPEED = 5.0;
    
    // Verifica conclusão de deslocamento (distância euclidiana)
    if (currentMovementType == "forward" || currentMovementType == "backward") {
        double dx = robot->pos.x - startPosition.x;
        double dy = robot->pos.y - startPosition.y;
        currentDistance = sqrt(dx*dx + dy*dy);

        if (currentDistance >= targetDistance) {
            // Alvo atingido: para o robô e avisa cliente
            stopRobot();
            sendResponse(QString("OK: Completed %1 movement of %2 units")
                        .arg(currentMovementType)
                        .arg(targetDistance, 0, 'f', 1));

            if (executingQueue) {
                executeNextCommand();
            }
        }

    // Verifica conclusão de rotação simples (acumula variação angular)
    } else if (currentMovementType == "rotate_left" || currentMovementType == "rotate_right") {

        double angleDiff = robot->angle - lastAngle;

        // Normaliza diferença para o intervalo [-pi, pi]
        while (angleDiff > M_PI) angleDiff -= 2*M_PI;
        while (angleDiff < -M_PI) angleDiff += 2*M_PI;

        // Acumula a rotação observada — o código tenta lidar com wrap-around
        if (currentMovementType == "rotate_left") {
            if (angleDiff > 0) {
                accumulatedRotation += angleDiff;
            } else if (angleDiff < -M_PI/2) {
                // Caso a diferença tenha dado volta (wrap-around), corrige
                accumulatedRotation += (2*M_PI + angleDiff);
            }
        } else {
            if (angleDiff < 0) {
                accumulatedRotation += abs(angleDiff);
            } else if (angleDiff > M_PI/2) {
                accumulatedRotation += (2*M_PI - angleDiff);
            }
        }

        lastAngle = robot->angle;
        currentDistance = accumulatedRotation;

        if (currentDistance >= targetDistance) {
            stopRobot();
            accumulatedRotation = 0.0;
            sendResponse(QString("OK: Completed %1 rotation of %2 degrees")
                        .arg(currentMovementType)
                        .arg(targetDistance * 180.0 / M_PI, 0, 'f', 1));

            if (executingQueue) {
                executeNextCommand();
            }
        }

    // Caso: giro de 90° seguido por deslocamento (o código usa um estado intermediário)
    } else if (currentMovementType == "turn_left_then_move" || currentMovementType == "turn_right_then_move") {
        double angleDiff = robot->angle - lastAngle;

        while (angleDiff > M_PI) angleDiff -= 2*M_PI;
        while (angleDiff < -M_PI) angleDiff += 2*M_PI;

        if (currentMovementType == "turn_left_then_move") {
            if (angleDiff > 0) {
                accumulatedRotation += angleDiff;
            } else if (angleDiff < -M_PI/2) {
                accumulatedRotation += (2*M_PI + angleDiff);
            }
        } else {
            if (angleDiff < 0) {
                accumulatedRotation += abs(angleDiff);
            } else if (angleDiff > M_PI/2) {
                accumulatedRotation += (2*M_PI - angleDiff);
            }
        }

        lastAngle = robot->angle;
        currentDistance = accumulatedRotation;

        if (currentDistance >= targetDistance) {
            // Ao terminar o giro, fixa novo alvo: deslocamento pendente
            accumulatedRotation = 0.0;
            startPosition = robot->pos;
            targetDistance = pendingMoveDistance;
            currentDistance = 0.0;

            // Depois do giro o comportamento passa a ser mover para frente
            currentMovementType = "forward";

            robot->leftSpeed = DEFAULT_SPEED;
            robot->rightSpeed = DEFAULT_SPEED;

            sendResponse(QString("OK: Rotation complete, now moving forward %1 units")
                        .arg(pendingMoveDistance, 0, 'f', 1));

            pendingMoveDistance = 0.0;
        }
    }
}

void SocketControlExample::stopRobot()
{
    robot->leftSpeed = 0.0;
    robot->rightSpeed = 0.0;
    isMoving = false;
    targetDistance = 0.0;
    currentDistance = 0.0;
    currentMovementType = "";
}

    // Função utilitária para parar quaisquer movimentos e limpar estados

void SocketControlExample::resetRotationTracking()
{
    accumulatedRotation = 0.0;
    lastAngle = startAngle;
}

void SocketControlExample::onNewConnection()
{
    clientSocket = server->nextPendingConnection();
    
    connect(clientSocket, &QTcpSocket::readyRead, this, &SocketControlExample::onDataReceived);
    connect(clientSocket, &QTcpSocket::disconnected, this, &SocketControlExample::onClientDisconnected);
    
    cout << "Cliente conectado!" << endl;
    sendResponse("HELLO: Connected to Enki Robot Controller");
    sendResponse("COMMANDS: Use format XF;YB;ZL;WR (e.g., 10F;5R) or stop, status, quit");
}

void SocketControlExample::onDataReceived()
{
    if (!clientSocket) return;
    
    QByteArray data = clientSocket->readAll();
    QString command = QString::fromUtf8(data).trimmed();
    
    if (!command.isEmpty()) {
        cout << "Comando recebido: " << command.toStdString() << endl;
        processCommand(command);
    }
}

void SocketControlExample::onClientDisconnected()
{
    cout << "Cliente desconectado." << endl;
    clientSocket = nullptr;
}

void SocketControlExample::sendStatus()
{
    if (clientSocket && clientSocket->state() == QTcpSocket::ConnectedState) {
    // Esta função poderia enviar periodicamente o status do robô ao cliente.
    // Atualmente o corpo está vazio porque o envio é feito por demanda via comando 'status'.
    }
}

SocketControlExample::~SocketControlExample()
{
    if (server) {
        server->close();
    }
    cout << "Simulação finalizada após " << stepCounter << " passos." << endl;
}

int main(int argc, char *argv[])
{
    QApplication app(argc, argv);
    
    World world(120, 120, Color(0.9, 0.9, 0.9));

    SocketControlExample viewer(&world);
    viewer.setWindowTitle("Controle via Socket - Enki Robotics");
    viewer.resize(800, 600);
    viewer.show();
    
    cout << "\nFeche a janela ou envie 'quit' via socket para sair." << endl;
    cout << "Exemplo de comando: 10F;5R (10 unidades frente + 5 unidades direita)" << endl;
    
    return app.exec();
}

#include "enkiSocketControl.moc"
