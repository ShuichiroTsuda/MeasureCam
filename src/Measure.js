import Expo, { AR } from 'expo';
import ExpoTHREE, { THREE } from 'expo-three';
import * as ThreeAR from 'expo-three-ar';
import React from 'react';
import { Dimensions, LayoutAnimation, StyleSheet, View, Button, Text } from 'react-native';
import { State, TapGestureHandler, TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { View as GraphicsView } from 'expo-graphics';
import SizeText from './SizeText';

const { width, height } = Dimensions.get('window');

export default class Measure extends React.Component {
    state = {
        distance: 0,
    }
    magneticObject = new ThreeAR.MagneticObject();

    async componentWillMount() {
        AR.onDidFailWithError(({ error }) => {
            console.error(error);
        });

        AR.onSessionWasInterrupted(() => {
            console.log("Backgrounded App: Session was interrupted");
        });

        AR.onSessionInterruptionEnded(() => {
            console.log("Forgrounded App: Session is no longer interrupted");
            AR.reset();
            AR.setPlaneDetection(AR.PlaneDetectionTypes.Horizontal);
        });
    }

    measure = async => {
        const { hitTest } = await AR.performHitTest(
            {
                x: 0.5,
                y: 0.5,
            },
            AR.HitTestResultTypes.HorizontalPlane
        );
    }

    onTap = async event => {
        if (event.nativeEvent.state !== State.ACTIVE) {
            console.log('not active');
            return;
        }

        if (this.endNode) {
            //reset
            console.log('reset');
            this.scene.remove(this.startNode);
            this.startNode = null;
            this.scene.remove(this.endNode);
            this.endNode = null;
            this.setState({ distance: '0.0' });
            this.line.visible = false;
            return;
        }

        this.line.visible = true;

        const { hitTest } = await AR.performHitTest(
            {
                x: 0.5,
                y: 0.5,
            },
            AR.HitTestResultTypes.HorizontalPlane
        );

        if (hitTest.length > 0) {
            const result = hitTest[0];

            let hitPosision = ThreeAR.positionFromTransform(
                ThreeAR.convertTransformArray(result.worldTransform)
            );

            const redius = 0.005;
            const geometry = new THREE.SphereBufferGeometry(redius, 32, 32);
            const material = new THREE.MeshBasicMaterial({color: 0xff0000});
            const node = new THREE.Mesh(geometry, material);
            node.position.set(hitPosision.x, hitPosision.y, hitPosision.z);
            this.scene.add(node);
            console.log('len>0');

            if (this.startNode) {
                this.endNode = node;
            } else {
                this.startNode = node;
            }
        } else {
            const dist = 0.1;
            const translation = new THREE.Vector3(0, 0, -dist);
            translation.applyQuaternion(this.camera.quarternion);

            //add a node to a session
            const radius = 0.005;
            const geometry = new THREE.SphereBufferGeometry(radius, 32, 32);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const node = new THREE.Mesh(geometry, material);
            node.position.set(translation.x, translation.y, translation.z);
            this.scene.add(node);
            console.log('ko')

            if (this.startNode) {
                this.endNode = node;
            } else {
                this.startNode = node;
            }
        }
    };

    get screenCenter() {
        return new THREE.Vector2(width / 2, height / 2);
    }

    render() {
        const { distance } = this.state;
        const config = AR.TrackingConfigurations.World;

        LayoutAnimation.easeInEaseOut();
/*
        return(
            <View style={StyleSheet.container}>
                <TapGestureHandler onHandlerStateChange={this.onTap}>
                    <View style={StyleSheet.container}>
                        <GraphicsView
                            style={StyleSheet.container}
                            onContextCreate={this.onContextCreate}
                            onRender={this.onRender}
                            onResize={this.onResize}
                            arTrackingConfiguration={config}
                            isArEnabled={true}
                            isArRunningStateEnabled
                            isArCameraStateEnabled
                        />
                        {console.log('reach glview')}
                    </View>
                </TapGestureHandler>
                <View style={styles.footer}>
                    <SizeText>
                        distance: {distance}
                        {console.log('reach distance')}
                    </SizeText>
                </View>
            </View>
        );
*/
            return(
                <View style={styles.container}>          
                        <GraphicsView
                        style={styles.container}
                        onContextCreate={this.onContextCreate}
                        onRender={this.onRender}
                        onResize={this.onResize}
                        arTrackingConfiguration={config}
                        isArEnabled={true}
                        isArRunningStateEnabled
                        isArCameraStateEnabled
                        />
                    <TapGestureHandler onHandlerStateChange={this.onTap}> 
                        <View style={styles.footer}>
                            <SizeText>
                                distance: {distance}
                                {console.log('reach distance')}
                            </SizeText>
                        </View>
                    </TapGestureHandler>  
                </View>
            );
    }

    onContextCreate = async ({gl, scale, width, height}) => {
        AR.setPlaneDetection(AR.PlaneDetectionTypes.Horizontal);

        this.renderer = new ExpoTHREE.Renderer({
            gl,
            scale,
            width,
            height,
        });
        this.renderer.setPixelRatio(scale);
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0xffffff, 1.0);

        this.scene = new THREE.Scene();
        //this.scene.backgroud = ThreeAR.createARBackgroundTexture(this.renderer);
        this.scene.background = new ThreeAR.BackgroundTexture(this.renderer);

        //this.camera = ThreeAR.createARCamera(width, height, 0.01, 1000);
        this.camera = new ThreeAR.Camera(width, height, 0.01, 1000);

        this.setupLine();

        this.magneticObject.add(new THREE.GridHelper(0.1, 5, 0xff0000, 0x0000ff));
        this.scene.add(this.magneticObject);
        console.log('onContextCreate');
    };

    setupLine = () => {
        const geometry = new THREE.Geometry();
        geometry.vertices.push(new THREE.Vector3());
        geometry.vertices.push(new THREE.Vector3(1, 1, 1));
        geometry.verticesNeedUpdate = true;
        geometry.dynamic = true;

        this.line = new THREE.Line(
            geometry,
            new THREE.LineBasicMaterial({
                color: 0x00ff00,
                opacity: 1,
                linewidth: 7,
                side: THREE.DoubleSide,
                linecap: 'cap',
            })
        );

        this.line.visible = false;
        this.scene.add(this.line);
    };

    updateLine = () => {
        if (!this.startNode || !this.line.visible) {
            return;
        }
        this.line.geometry.vertices[0].copy(this.startNode.position);

        if (this.endNode) {
            this.line.geometry.vertices[1].copy(this.endNode.position);
        } else {
            this.line.geometry.vertices[1].copy(this.magneticObject.position);
        }

        const size = this.startNode.position.distanceTo(this.magneticObject.position);
        console.log('size' + size);
        const lessPreciseSize = Math.round(size * 10) / 10;
        this.setState({ distance: lessPreciseSize });

        this.line.geometry.verticesNeedUpdate = true;
    }

    onResize = ({ x, y, scale, width, height }) => {
        if (!this.renderer) {
            return;
        }
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setPixelRatio(scale);
        this.renderer.setSize(width, height);
        console.log('onResize');
    };

    onRender = () => {
        this.magneticObject.update(this.camera, this.screenCenter);
        this.updateLine();
        this.renderer.render(this.scene, this.camera);
    };
}

const styles = StyleSheet.create({
    container: { flex: 1 },
/*    footer: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        justifyContent: 'center',
        flexDirection: 'row',
    },
*/
    footer: {
        flex: 1,
    }
})