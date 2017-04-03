import * as React from "react";

import "./map.scss";

import { connect } from "react-redux";
import { Game, MapTemplate, MapClient, Country, CountryTemplate, PlayState } from "../../../external/imperaClients";
import { IState } from "../../../reducers";
import { getCachedClient } from "../../../clients/clientFactory";
import { imageBaseUri } from "../../../configuration";
import { css } from "../../../lib/css";
import { autobind } from "../../../lib/autobind";
import { log } from "../../../lib/log";
import { selectCountry, setPlaceUnits, setActionUnits, attack, move } from "../play.actions";
import { ITwoCountry } from "../play.reducer";

import "jsplumb";
import { debounce } from "../../../lib/debounce";
import { MapTemplateCacheEntry } from "../mapTemplateCache";
import { CountryInputField } from "./countryInput";

enum MapState {
    DisplayOnly,
    Place,
    Move,
    Attack,
    History
}

enum MouseState {
    Default,
    ActionDragger
}

const KeyBindings = {
    "ABORT": 27, // Escape

    "INCREASE_UNITCOUNT": 38, // Cursor up
    "DECREASE_UNITCOUNT": 40, // Cursor down
    "SUBMIT_ACTION": 13 // Enter
};

interface IMapProps {
    game: Game;
    mapTemplate: MapTemplateCacheEntry;
    placeCountries: { [id: string]: number };
    twoCountry: ITwoCountry;
    idToCountry: { [id: string]: Country };

    selectCountry: (countryIdentifier: string) => void;
    setUnits: (countryIdentifier: string, units: number) => void;
    setActionUnits: (units: number) => void;
    attack: () => void;
    move: () => void;
}

interface IMapState {
    isLoading: boolean;
    hoveredCountry: string;
}

class Map extends React.Component<IMapProps, IMapState> {
    private _jsPlumb: jsPlumbInstance;
    private _connection: Connection;
    private _inputElement: HTMLInputElement;
    private _inputElementWrapper: HTMLDivElement;

    constructor(props: IMapProps, context) {
        super(props, context);

        this.state = {
            isLoading: false,
            hoveredCountry: null
        };

        this._jsPlumb = jsPlumb.getInstance();
    }

    componentWillReceiveProps(props: IMapProps) {
        if (this.props.game !== props.game) {
            this._update(props);
        }
    }

    private _update(props: IMapProps) {
        const { game, mapTemplate } = props;

        if (game && !mapTemplate) {
            this.setState({
                isLoading: true
            } as IMapState);
        } else {
            this.setState({
                isLoading: false
            } as IMapState);
        }
    }

    render(): JSX.Element {
        const { twoCountry, mapTemplate } = this.props;

        return <div className="map" onClick={this._onClick} onMouseMove={this._onMouseMove}>
            {mapTemplate && <img src={mapTemplate.image} className="map" />}
            {mapTemplate && this._renderCountries()}

            {this._renderUnitInput()}
        </div>;
    }

    componentDidUpdate() {
        this._renderConnections();
        this._renderConnection();

        const { twoCountry } = this.props;
        const showConnection = !!twoCountry.originCountryIdentifier && !!twoCountry.destinationCountryIdentifier;

        if (showConnection) {
            this._inputElement.focus();
        }
    }

    private _renderCountries() {
        const { game, placeCountries, idToCountry, mapTemplate } = this.props;
        const { map } = game;
        const { hoveredCountry } = this.state;

        return mapTemplate.countries.map(countryTemplate => {
            const country = idToCountry[countryTemplate.identifier];
            const team = game.teams.filter(t => t.id === country.teamId)[0];
            const player = team.players.filter(p => p.id === country.playerId)[0];

            const isHighlighted = hoveredCountry && mapTemplate.areConnected(hoveredCountry, country.identifier);

            const placeUnits = placeCountries[countryTemplate.identifier];
            const hasInput = placeUnits !== undefined;

            return [<div
                id={countryTemplate.identifier}
                key={countryTemplate.identifier}
                className={css(
                    "country",
                    "player-" + (player.playOrder + 1),
                    {
                        "country-highlight": isHighlighted
                    })}
                style={{
                    left: countryTemplate.x,
                    top: countryTemplate.y
                }}>
                {country.units}
            </div>,
            hasInput && <CountryInputField
                key={`p${countryTemplate.identifier}`}
                countryTemplate={countryTemplate}
                value={placeUnits}
                onChange={(units) => this.props.setUnits(countryTemplate.identifier, units)} />
            ];
        });
    }

    private _renderConnections() {
        const { twoCountry, game } = this.props;
        const showConnections = !!twoCountry.originCountryIdentifier && !twoCountry.destinationCountryIdentifier;
        if (!showConnections) {
            // Remove any arrows
            this._jsPlumb.unbind("click");
            this._jsPlumb.detachEveryConnection();
            (this._jsPlumb as any).deleteEveryEndpoint();
            return;
        }

        (jsPlumb as any).doWhileSuspended(() => {
            for (let destination of twoCountry.allowedDestinations) {
                this._jsPlumb.connect({
                    source: twoCountry.originCountryIdentifier,
                    target: destination,
                    cssClass: "connections connections-" + (game.playState === PlayState.Attack ? "attack" : "move"),
                    hoverClass: "connections-hover",
                    anchors: [
                        ["Perimeter", { shape: "Circle" }],
                        ["Perimeter", { shape: "Circle" }]
                    ],
                    connector: ["StateMachine"],
                    endpoint: "Blank",
                    paintStyle: {
                        outlineWidth: 15, // Increased hit target
                        outlineColor: "transparent",
                        outlineStroke: "black"
                    },
                    hoverPaintStyle: {
                        lineWidth: 4
                    },
                    overlays: [
                        ["PlainArrow", { location: 1, width: 15, length: 12 }]
                    ]
                } as any);

                this._jsPlumb.bind("click", (connection) => {
                    const targetId: string = connection.targetId;
                    this.props.selectCountry(targetId);
                });
            }
        });
    }

    private _renderConnection() {
        const { twoCountry, game } = this.props;
        const showConnections = !!twoCountry.originCountryIdentifier && !!twoCountry.destinationCountryIdentifier;
        if (!showConnections) {
            this._connection = null;
            return;
        }

        this._connection = this._jsPlumb.connect({
            source: twoCountry.originCountryIdentifier,
            target: twoCountry.destinationCountryIdentifier,
            anchors: [
                ["Perimeter", { shape: "Circle" }],
                ["Perimeter", { shape: "Circle" }]
            ],
            endpoint: "Blank",
            paintStyle: {
                outlineWidth: 15,
                outlineColor: "transparent",
                outlineStroke: "black"
            },
            connector: ["StateMachine"],
            cssClass: "connections connections-" + (game.playState === PlayState.Attack ? "attack" : "move"),
            overlays: [
                ["Custom", {
                    create: (component) => {
                        return $(this._inputElementWrapper);
                    },
                    location: 0.5,
                    id: "unit-input"
                }],
                ["PlainArrow", { location: 1, width: 20, length: 12 }]
            ]
        } as any);
    }

    private _renderUnitInput(): JSX.Element {
        const { destinationCountryIdentifier, numberOfUnits, minUnits, maxUnits } = this.props.twoCountry;

        return <div className="action-overlay-wrapper" ref={this._resolveInputWrapper}>
            <input
                className="action-overlay-input"
                type="number"
                min={minUnits}
                max={maxUnits}
                value={numberOfUnits}
                onChange={this._changeUnits}
                onKeyUp={this._onKeyUp}
                style={{
                    display: !destinationCountryIdentifier ? "none" : "block"
                }}
                ref={this._resolveInput} />
        </div>;
    }

    @autobind
    private _resolveInputWrapper(element: HTMLDivElement) {
        this._inputElementWrapper = element;
    }

    @autobind
    private _resolveInput(element: HTMLInputElement) {
        this._inputElement = element;
    }

    @autobind
    private _changeUnits(ev: React.FormEvent<HTMLInputElement>) {
        const value = (ev.target as HTMLInputElement).value;
        const units = parseInt(value, 10);

        this.props.setActionUnits(units);
    }

    @autobind
    private _onClick(ev: React.MouseEvent<HTMLDivElement>) {
        const target = ev.target as HTMLDivElement;

        if (target.classList.contains("country")) {
            const countryIdentifier = target.id;
            this._onCountryClick(countryIdentifier);
        } else if (target.classList.contains("map")) {
            // Cancel any country selection
            this.props.selectCountry(null);
        }
    }

    private _onCountryClick(countryIdentifier: string) {
        const { game, twoCountry } = this.props;

        if (!!twoCountry.originCountryIdentifier && !!twoCountry.destinationCountryIdentifier) {
            this._performAction();
        } else {
            this.props.selectCountry(countryIdentifier);
        }
    }

    @autobind
    private _onMouseMove(ev: React.MouseEvent<HTMLDivElement>) {
        const target = ev.target as HTMLDivElement;

        if (target.classList.contains("country")) {
            // on country
            const countryIdentifier = target.id;

            if (this.state.hoveredCountry !== countryIdentifier) {
                this.setState({
                    hoveredCountry: countryIdentifier
                } as IMapState);
            }
        } else if (this.state.hoveredCountry) {
            this.setState({
                hoveredCountry: null
            } as IMapState);
        }
    }

    @autobind
    private _onKeyUp(ev: React.KeyboardEvent<HTMLInputElement>) {
        switch (ev.keyCode) {
            case KeyBindings.SUBMIT_ACTION:
                this._performAction();
                break;

            case KeyBindings.ABORT:
                this.props.selectCountry(null);
                break;
        }
    }

    private _performAction() {
        const { game } = this.props;

        if (game.playState === PlayState.Attack) {
            this.props.attack();
        } else if (game.playState === PlayState.Move) {
            this.props.move();
        }
    }
}

export default connect((state: IState) => {
    const { game, placeCountries, countriesByIdentifier, twoCountry, mapTemplate } = state.play.data;

    return {
        game: game,
        mapTemplate: mapTemplate,
        placeCountries: placeCountries,
        twoCountry: twoCountry,
        idToCountry: countriesByIdentifier
    };
}, (dispatch) => ({
    selectCountry: (countryIdentifier: string) => { dispatch(selectCountry(countryIdentifier)); },
    setUnits: (countryIdentifier: string, units: number) => { dispatch(setPlaceUnits(countryIdentifier, units)); },
    setActionUnits: (units: number) => { dispatch(setActionUnits(units)); },
    attack: () => dispatch(attack(null)),
    move: () => dispatch(move(null))
}))(Map);